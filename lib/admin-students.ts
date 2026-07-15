import { prisma } from '@/lib/prisma'

// Shape returned to the admin Students directory. Dates are real Date objects
// here; the API route serializes them to ISO strings via NextResponse.json,
// and the server page does the same via a JSON round-trip before passing them
// to the client — so both entry points hand the client identical data.
export type AdminStudentSummary = {
  student: { id: string; email: string; name: string | null; avatarUrl: string | null; createdAt: Date }
  wikis: {
    wikiSlug: string
    teacherName: string | null
    teacherEmail: string
    joinedAt: Date
    status: string
    progress: { completed: number; in_progress: number; total: number }
  }[]
  totalCompleted: number
  totalLessons: number
}

// Builds the admin Students directory list.
//   includeFormer=false → active enrollments only (default view)
//   includeFormer=true  → also students whose enrollments were revoked (link
//                         disabled) or removed, so their data stays findable.
export async function getAdminStudentsList(includeFormer: boolean): Promise<AdminStudentSummary[]> {
  const [allEnrollments, trackAssignments] = await Promise.all([
    prisma.enrollment.findMany({
      where: includeFormer ? {} : { status: 'active' },
      orderBy: { joinedAt: 'desc' },
      include: {
        student: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } },
        teacher: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.trackAssignment.findMany({
      orderBy: { assignedAt: 'desc' },
      include: {
        student: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } },
        track: { include: { wikis: true } },
      },
    }),
  ])

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

  // Track assignments are also active wiki access. Add track-only students and
  // track-only wikis without duplicating a direct enrollment for the same wiki.
  for (const assignment of trackAssignments) {
    if (!studentMap.has(assignment.studentId)) {
      studentMap.set(assignment.studentId, { student: assignment.student, wikis: [] })
    }
    const entry = studentMap.get(assignment.studentId)!
    for (const wiki of assignment.track.wikis) {
      if (entry.wikis.some((item) => item.wikiSlug === wiki.wikiSlug)) continue
      entry.wikis.push({
        wikiSlug: wiki.wikiSlug,
        teacherName: `Track: ${assignment.track.name}`,
        teacherEmail: assignment.track.createdByEmail || 'Track assignment',
        joinedAt: assignment.assignedAt,
        status: 'active',
      })
    }
  }

  const studentIds = Array.from(studentMap.keys())
  const wikiSlugs = [...new Set(Array.from(studentMap.values()).flatMap(entry => entry.wikis.map(wiki => wiki.wikiSlug)))]
  const publishedLessons = wikiSlugs.length
    ? await prisma.lesson.findMany({ where: { wikiSlug: { in: wikiSlugs }, status: 'published' }, select: { id: true, wikiSlug: true } })
    : []

  // Progress summary per student per wiki
  const progressRows = studentIds.length && publishedLessons.length
    ? await prisma.lessonProgress.groupBy({
        by: ['studentId', 'wikiSlug', 'status'],
        where: { studentId: { in: studentIds }, lessonId: { in: publishedLessons.map(lesson => lesson.id) } },
        _count: true,
      })
    : []

  // Total published lessons per wiki (for % calculation)
  const totalLessonsMap: Record<string, number> = {}
  for (const lesson of publishedLessons) totalLessonsMap[lesson.wikiSlug] = (totalLessonsMap[lesson.wikiSlug] || 0) + 1

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

  return Array.from(studentMap.values()).map(({ student, wikis }) => {
    const wikiProgress = wikis.map(w => ({
      ...w,
      progress: progMap[student.id]?.[w.wikiSlug] ?? { completed: 0, in_progress: 0, total: totalLessonsMap[w.wikiSlug] || 0 },
    }))
    const totalCompleted = wikiProgress.reduce((s, w) => s + w.progress.completed, 0)
    const totalLessons = wikiProgress.reduce((s, w) => s + w.progress.total, 0)
    return { student, wikis: wikiProgress, totalCompleted, totalLessons }
  })
}
