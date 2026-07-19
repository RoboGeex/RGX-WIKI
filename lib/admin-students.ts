import { prisma } from '@/lib/prisma'
import { getPublishedLessonsByWiki } from '@/lib/wiki-lessons'

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
    }),
    prisma.trackAssignment.findMany({
      orderBy: { assignedAt: 'desc' },
    }),
  ])

  // relationMode="prisma" enforces no foreign keys, so a row may reference a
  // user/track that was since deleted (an orphan). Resolve related records
  // separately and skip dangling references, instead of using required-relation
  // includes — those throw "Field X is required to return data, got null" the
  // moment a single orphan exists, taking down the whole page.
  const relatedUserIds = new Set<string>()
  for (const e of allEnrollments) { relatedUserIds.add(e.studentId); relatedUserIds.add(e.teacherId) }
  for (const a of trackAssignments) relatedUserIds.add(a.studentId)
  const relatedTrackIds = [...new Set(trackAssignments.map((a) => a.trackId))]

  const [relatedUsers, relatedTracks] = await Promise.all([
    relatedUserIds.size
      ? prisma.user.findMany({
          where: { id: { in: [...relatedUserIds] } },
          select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
        })
      : [],
    relatedTrackIds.length
      ? prisma.track.findMany({ where: { id: { in: relatedTrackIds } }, include: { wikis: true } })
      : [],
  ])
  const userById = new Map(relatedUsers.map((u) => [u.id, u]))
  const trackById = new Map(relatedTracks.map((t) => [t.id, t]))

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
    const student = userById.get(e.studentId)
    if (!student) continue // orphaned enrollment — student no longer exists
    if (!studentMap.has(e.studentId)) {
      studentMap.set(e.studentId, { student, wikis: [] })
    }
    const teacher = userById.get(e.teacherId)
    studentMap.get(e.studentId)!.wikis.push({
      wikiSlug: e.wikiSlug,
      teacherName: teacher?.name ?? null,
      teacherEmail: teacher?.email ?? 'Unknown teacher',
      joinedAt: e.joinedAt,
      status: e.status,
    })
  }

  // Track assignments are also active wiki access. Add track-only students and
  // track-only wikis without duplicating a direct enrollment for the same wiki.
  for (const assignment of trackAssignments) {
    const student = userById.get(assignment.studentId)
    const track = trackById.get(assignment.trackId)
    if (!student || !track) continue // orphaned assignment — skip
    if (!studentMap.has(assignment.studentId)) {
      studentMap.set(assignment.studentId, { student, wikis: [] })
    }
    const entry = studentMap.get(assignment.studentId)!
    for (const wiki of track.wikis) {
      if (entry.wikis.some((item) => item.wikiSlug === wiki.wikiSlug)) continue
      entry.wikis.push({
        wikiSlug: wiki.wikiSlug,
        teacherName: `Track: ${track.name}`,
        teacherEmail: track.createdByEmail || 'Track assignment',
        joinedAt: assignment.assignedAt,
        status: 'active',
      })
    }
  }

  const studentIds = Array.from(studentMap.keys())
  const wikiSlugs = [...new Set(Array.from(studentMap.values()).flatMap(entry => entry.wikis.map(wiki => wiki.wikiSlug)))]
  // Lessons live in each wiki's own database — the default client would
  // return 0 rows for per-wiki-DB wikis. Progress rows (default DB) are
  // joined to these lessons below by lesson id.
  const lessonsByWiki = await getPublishedLessonsByWiki(wikiSlugs)
  const publishedLessons = wikiSlugs.flatMap(slug =>
    (lessonsByWiki.get(slug) ?? []).map(lesson => ({ id: lesson.id, wikiSlug: slug }))
  )

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
