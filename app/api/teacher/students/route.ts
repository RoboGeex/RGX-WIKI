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
        student: { select: { id: true, email: true, name: true } },
        link: { select: { id: true, token: true, isActive: true } },
      },
    })

    // Attach progress counts per student
    const studentIds = enrollments.map((e) => e.studentId)
    const progress = studentIds.length
      ? await prisma.lessonProgress.groupBy({
          by: ['studentId', 'status'],
          where: { studentId: { in: studentIds }, wikiSlug },
          _count: true,
        })
      : []

    const progressMap: Record<string, { completed: number; in_progress: number }> = {}
    for (const p of progress) {
      if (!progressMap[p.studentId]) progressMap[p.studentId] = { completed: 0, in_progress: 0 }
      if (p.status === 'completed') progressMap[p.studentId].completed = p._count
      if (p.status === 'in_progress') progressMap[p.studentId].in_progress = p._count
    }

    const students = enrollments.map((e) => ({
      enrollmentId: e.id,
      joinedAt: e.joinedAt,
      student: e.student,
      link: e.link,
      progress: progressMap[e.studentId] || { completed: 0, in_progress: 0 },
    }))

    return NextResponse.json({ students })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
