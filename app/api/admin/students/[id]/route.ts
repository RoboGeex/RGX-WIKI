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
