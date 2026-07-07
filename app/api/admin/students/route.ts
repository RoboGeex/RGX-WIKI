import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'

export async function GET(request: Request) {
  try {
    await requireAdminAccess()

    // Default: active enrollments only. ?includeFormer=1 also returns students
    // whose enrollments were revoked (link disabled) or removed, so their data
    // stays findable after a teacher turns off an invite link.
    const { searchParams } = new URL(request.url)
    const includeFormer = searchParams.get('includeFormer') === '1'

    const allEnrollments = await prisma.enrollment.findMany({
      where: includeFormer ? {} : { status: 'active' },
      orderBy: { joinedAt: 'desc' },
      include: {
        student: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } },
        teacher: { select: { id: true, email: true, name: true } },
      },
    })

    // One row per (student, wiki): prefer the active enrollment; otherwise the
    // most recent inactive one (rejoining via a new link leaves old rows behind).
    const byStudentWiki = new Map<string, (typeof allEnrollments)[number]>()
    for (const e of allEnrollments) {
      const key = `${e.studentId}::${e.wikiSlug}`
      const current = byStudentWiki.get(key)
      if (!current || (e.status === 'active' && current.status !== 'active')) {
        byStudentWiki.set(key, e)
      }
    }
    const enrollments = Array.from(byStudentWiki.values())

    // Group by student — one student may be in multiple wikis
    const studentMap = new Map<string, {
      student: { id: string; email: string; name: string | null; avatarUrl: string | null; createdAt: Date }
      wikis: { wikiSlug: string; teacherName: string | null; teacherEmail: string; joinedAt: Date; status: string }[]
    }>()

    for (const e of enrollments) {
      if (!studentMap.has(e.studentId)) {
        studentMap.set(e.studentId, { student: e.student, wikis: [] })
      }
      studentMap.get(e.studentId)!.wikis.push({
        wikiSlug: e.wikiSlug,
        teacherName: e.teacher.name,
        teacherEmail: e.teacher.email,
        joinedAt: e.joinedAt,
        status: e.status,
      })
    }

    const studentIds = Array.from(studentMap.keys())

    // Progress summary per student per wiki
    const progressRows = studentIds.length
      ? await prisma.lessonProgress.groupBy({
          by: ['studentId', 'wikiSlug', 'status'],
          where: { studentId: { in: studentIds } },
          _count: true,
        })
      : []

    // Total published lessons per wiki (for % calculation)
    const wikiSlugs = [...new Set(enrollments.map(e => e.wikiSlug))]
    const lessonCounts = wikiSlugs.length
      ? await prisma.lesson.groupBy({
          by: ['wikiSlug'],
          where: { wikiSlug: { in: wikiSlugs }, status: 'published' },
          _count: true,
        })
      : []
    const totalLessonsMap: Record<string, number> = {}
    for (const lc of lessonCounts) totalLessonsMap[lc.wikiSlug] = lc._count

    // Build progress map: studentId → wikiSlug → { completed, in_progress, total }
    const progMap: Record<string, Record<string, { completed: number; in_progress: number; total: number }>> = {}
    for (const p of progressRows) {
      if (!progMap[p.studentId]) progMap[p.studentId] = {}
      if (!progMap[p.studentId][p.wikiSlug]) {
        progMap[p.studentId][p.wikiSlug] = { completed: 0, in_progress: 0, total: totalLessonsMap[p.wikiSlug] || 0 }
      }
      if (p.status === 'completed') progMap[p.studentId][p.wikiSlug].completed = p._count
      if (p.status === 'in_progress') progMap[p.studentId][p.wikiSlug].in_progress = p._count
    }

    const students = Array.from(studentMap.values()).map(({ student, wikis }) => {
      const wikiProgress = wikis.map(w => ({
        ...w,
        progress: progMap[student.id]?.[w.wikiSlug] ?? { completed: 0, in_progress: 0, total: totalLessonsMap[w.wikiSlug] || 0 },
      }))
      const totalCompleted = wikiProgress.reduce((s, w) => s + w.progress.completed, 0)
      const totalLessons = wikiProgress.reduce((s, w) => s + w.progress.total, 0)
      return { student, wikis: wikiProgress, totalCompleted, totalLessons }
    })

    return NextResponse.json({ students })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
