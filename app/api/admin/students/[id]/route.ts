import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminAccess()

    const student = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, name: true, createdAt: true },
    })
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    // All active enrollments for this student
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: params.id, status: 'active' },
      include: { teacher: { select: { name: true, email: true } } },
    })

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
