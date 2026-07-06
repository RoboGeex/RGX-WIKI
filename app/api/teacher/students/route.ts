import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/auth'

// GET /api/teacher/students?wikiSlug=xxx
// Returns active enrollments + per-student lesson progress summary
export async function GET(request: Request) {
  try {
    const teacher = await requireRole('admin', 'teacher')
    const { searchParams } = new URL(request.url)
    const wikiSlug = searchParams.get('wikiSlug') || ''
    if (!wikiSlug) return NextResponse.json({ error: 'wikiSlug required' }, { status: 400 })

    const enrollments = await prisma.enrollment.findMany({
      where: { teacherId: teacher.id, wikiSlug, status: 'active' },
      orderBy: { joinedAt: 'desc' },
      include: {
        student: { select: { id: true, email: true, name: true, avatarUrl: true } },
        link: { select: { id: true, token: true, isActive: true } },
      },
    })

    const studentIds = enrollments.map((e) => e.studentId)
    const lessons = await prisma.lesson.findMany({
      where: { wikiSlug, status: 'published' },
      orderBy: { order: 'asc' },
      select: { id: true, title_en: true, order: true, duration_min: true },
    })

    const progress = studentIds.length
      ? await prisma.lessonProgress.findMany({
          where: { studentId: { in: studentIds }, wikiSlug },
          select: { studentId: true, lessonId: true, status: true, completedAt: true, lastViewedAt: true },
        })
      : []

    const progressMap: Record<string, Record<string, { status: string; completedAt: Date | null; lastViewedAt: Date }>> = {}
    for (const p of progress) {
      if (!progressMap[p.studentId]) progressMap[p.studentId] = {}
      progressMap[p.studentId][p.lessonId] = p
    }

    const students = enrollments.map((e) => {
      const lessonDetails = lessons.map((l) => ({
        id: l.id,
        title: l.title_en,
        order: l.order,
        duration_min: l.duration_min,
        status: progressMap[e.studentId]?.[l.id]?.status ?? 'not_started',
        completedAt: progressMap[e.studentId]?.[l.id]?.completedAt ?? null,
        lastViewedAt: progressMap[e.studentId]?.[l.id]?.lastViewedAt ?? null,
      }))
      const completed = lessonDetails.filter((l) => l.status === 'completed').length
      const inProgress = lessonDetails.filter((l) => l.status === 'in_progress').length
      return {
        enrollmentId: e.id,
        joinedAt: e.joinedAt,
        student: e.student,
        link: e.link,
        progress: { completed, in_progress: inProgress, total: lessons.length },
        lessons: lessonDetails,
      }
    })

    return NextResponse.json({ students })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
