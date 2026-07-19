import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import HomeClient from './HomeClient'

async function getStudentData(userId: string) {
  const [enrollments, assignments] = await Promise.all([
    prisma.enrollment.findMany({ where: { studentId: userId, status: 'active' }, select: { wikiSlug: true } }),
    prisma.trackAssignment.findMany({
      where: { studentId: userId },
      orderBy: { assignedAt: 'desc' },
      include: { track: { include: { wikis: { orderBy: { position: 'asc' } } } } },
    }).catch((error) => {
      // P2021: Track tables missing from this DB (schema drift — see
      // scripts/create-track-tables.cjs). Show the student their direct
      // enrollments with no tracks rather than crashing /home.
      if (error?.code === 'P2021') return []
      throw error
    }),
  ])
  const directSlugs = [...new Set(enrollments.map((enrollment) => enrollment.wikiSlug))]
  const trackSlugs = assignments.flatMap((assignment) => assignment.track.wikis.map((wiki) => wiki.wikiSlug))
  const slugs = [...new Set([...directSlugs, ...trackSlugs])]
  if (slugs.length === 0) return { wikis: [], progress: {}, tracks: [] }

  const wikis = await prisma.wiki.findMany({
    where: { slug: { in: slugs } },
    orderBy: { displayName: 'asc' },
  })

  const publishedLessons = await prisma.lesson.findMany({
    where: { wikiSlug: { in: slugs }, status: 'published' },
    select: { id: true, wikiSlug: true },
  })
  const completed = publishedLessons.length ? await prisma.lessonProgress.findMany({
    where: { studentId: userId, lessonId: { in: publishedLessons.map((lesson) => lesson.id) }, status: 'completed' },
    select: { lessonId: true, wikiSlug: true },
  }) : []

  const progress: Record<string, { total: number; completed: number }> = {}
  for (const slug of slugs) progress[slug] = { total: 0, completed: 0 }
  for (const lesson of publishedLessons) progress[lesson.wikiSlug].total += 1
  for (const c of completed) {
    if (progress[c.wikiSlug]) progress[c.wikiSlug].completed += 1
  }

  const wikiMap = new Map(wikis.map((wiki) => [wiki.slug, wiki]))
  const tracks = assignments.map((assignment) => {
    const trackWikis = assignment.track.wikis
      .map((item) => wikiMap.get(item.wikiSlug))
      .filter((wiki): wiki is NonNullable<typeof wiki> => Boolean(wiki))
    const total = trackWikis.reduce((sum, wiki) => sum + (progress[wiki.slug]?.total || 0), 0)
    const completedCount = trackWikis.reduce((sum, wiki) => sum + (progress[wiki.slug]?.completed || 0), 0)
    return {
      id: assignment.track.id,
      name: assignment.track.name,
      description: assignment.track.description,
      assignedAt: assignment.assignedAt,
      wikis: trackWikis.map((wiki) => ({ ...wiki, progress: progress[wiki.slug] || { total: 0, completed: 0 } })),
      progress: { total, completed: completedCount },
    }
  })

  // Direct class enrollments remain visible as individual courses. Track-only
  // wikis are presented inside their track instead of being flattened.
  return { wikis: wikis.filter((wiki) => directSlugs.includes(wiki.slug)), progress, tracks }
}

async function getTeacherData(userId: string) {
  const teacher = await prisma.user.findUnique({ where: { id: userId } })
  const assigned: string[] = Array.isArray(teacher?.assignedWikiSlugs)
    ? (teacher.assignedWikiSlugs as string[])
    : []
  if (assigned.length === 0) return { wikis: [], studentCounts: {} }

  const wikis = await prisma.wiki.findMany({
    where: { isPublished: true, slug: { in: assigned } },
    orderBy: { displayName: 'asc' },
  })

  // Active student count per wiki
  const enrollmentCounts = await prisma.enrollment.groupBy({
    by: ['wikiSlug'],
    where: { teacherId: userId, wikiSlug: { in: assigned }, status: 'active' },
    _count: true,
  })

  const studentCounts: Record<string, number> = {}
  for (const ec of enrollmentCounts) {
    studentCounts[ec.wikiSlug] = ec._count
  }

  return { wikis, studentCounts }
}

export default async function HomePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/home')
  if (user.role === 'admin') redirect('/dashboard')

  const studentData = user.role === 'student' ? await getStudentData(user.id) : null
  const teacherData = user.role === 'teacher' ? await getTeacherData(user.id) : null

  return (
    <HomeClient
      user={{ id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }}
      studentData={studentData}
      teacherData={teacherData}
    />
  )
}
