import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminAccess()

    const student = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    // All enrollments for this student, including revoked/removed ones so
    // progress data stays visible after an invite link is disabled.
    const allEnrollments = await prisma.enrollment.findMany({
      where: { studentId: params.id },
      orderBy: { joinedAt: 'desc' },
      include: { teacher: { select: { name: true, email: true } } },
    })

    // One section per wiki: prefer the active enrollment, else the latest one.
    const byWiki = new Map<string, (typeof allEnrollments)[number]>()
    for (const e of allEnrollments) {
      const current = byWiki.get(e.wikiSlug)
      if (!current || (e.status === 'active' && current.status !== 'active')) {
        byWiki.set(e.wikiSlug, e)
      }
    }
    const enrollments = Array.from(byWiki.values())
      .sort((a, b) => (a.status === b.status ? 0 : a.status === 'active' ? -1 : 1))

    const wikiSlugs = enrollments.map(e => e.wikiSlug)

    // All published lessons for these wikis
    const lessons = wikiSlugs.length
      ? await prisma.lesson.findMany({
          where: { wikiSlug: { in: wikiSlugs }, status: 'published' },
          orderBy: [{ wikiSlug: 'asc' }, { order: 'asc' }],
          select: { id: true, wikiSlug: true, title_en: true, order: true, duration_min: true },
        })
      : []

    // Student's progress on each lesson
    const progress = await prisma.lessonProgress.findMany({
      where: { studentId: params.id },
      select: { lessonId: true, status: true, completedAt: true, lastViewedAt: true },
    })
    const progressMap: Record<string, { status: string; completedAt: Date | null; lastViewedAt: Date }> = {}
    for (const p of progress) progressMap[p.lessonId] = p

    // Build wiki sections
    const wikis = await prisma.wiki.findMany({
      where: { slug: { in: wikiSlugs } },
      select: { slug: true, displayName: true },
    })
    const wikiNameMap: Record<string, string> = {}
    for (const w of wikis) wikiNameMap[w.slug] = w.displayName

    const sections = enrollments.map(e => {
      const wikiLessons = lessons.filter(l => l.wikiSlug === e.wikiSlug)
      const lessonDetails = wikiLessons.map(l => ({
        id: l.id,
        title: l.title_en,
        order: l.order,
        duration_min: l.duration_min,
        status: progressMap[l.id]?.status ?? 'not_started',
        completedAt: progressMap[l.id]?.completedAt ?? null,
        lastViewedAt: progressMap[l.id]?.lastViewedAt ?? null,
      }))
      const completed = lessonDetails.filter(l => l.status === 'completed').length
      const inProgress = lessonDetails.filter(l => l.status === 'in_progress').length
      return {
        wikiSlug: e.wikiSlug,
        wikiName: wikiNameMap[e.wikiSlug] || e.wikiSlug,
        teacher: e.teacher,
        joinedAt: e.joinedAt,
        status: e.status,
        removedAt: e.removedAt,
        lessons: lessonDetails,
        completed,
        inProgress,
        total: wikiLessons.length,
      }
    })

    return NextResponse.json({ student, sections })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}

async function requireStudent(id: string) {
  const student = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  })
  if (!student || student.role !== 'student') {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }
  return null
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminAccess()
    const missing = await requireStudent(params.id)
    if (missing) return missing

    const body = await request.json()
    const action = typeof body?.action === 'string' ? body.action : 'updateProfile'

    if (action === 'updateProfile') {
      const name = typeof body?.name === 'string' ? body.name.trim() : undefined
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined
      if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
      }

      const updated = await prisma.user.update({
        where: { id: params.id },
        data: {
          ...(name !== undefined && { name: name || null }),
          ...(email !== undefined && { email }),
        },
        select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
      })
      return NextResponse.json({ ok: true, student: updated })
    }

    if (action === 'removeFromWiki') {
      const wikiSlug = typeof body?.wikiSlug === 'string' ? body.wikiSlug.trim() : ''
      if (!wikiSlug) return NextResponse.json({ error: 'Choose a wiki.' }, { status: 400 })

      await prisma.enrollment.updateMany({
        where: { studentId: params.id, wikiSlug, status: 'active' },
        data: { status: 'removed', removedAt: new Date() },
      })
      return NextResponse.json({ ok: true })
    }

    if (action === 'removeFromAllWikis') {
      await prisma.enrollment.updateMany({
        where: { studentId: params.id, status: 'active' },
        data: { status: 'removed', removedAt: new Date() },
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : e?.code === 'P2002' ? 409 : 500
    const message = e?.code === 'P2002' ? 'That email is already in use.' : e?.message || 'Failed'
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminAccess()
    const missing = await requireStudent(params.id)
    if (missing) return missing

    await prisma.session.deleteMany({ where: { userId: params.id } })
    await prisma.lessonProgress.deleteMany({ where: { studentId: params.id } })
    await prisma.enrollment.deleteMany({ where: { studentId: params.id } })
    await prisma.user.delete({ where: { id: params.id } })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
