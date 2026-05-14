import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import HomeClient from './HomeClient'

async function getStudentData(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: userId, status: 'active' },
    select: { wikiSlug: true },
  })
  const slugs = enrollments.map((e) => e.wikiSlug)
  if (slugs.length === 0) return { wikis: [], progress: {} }

  const wikis = await prisma.wiki.findMany({
    where: { slug: { in: slugs } },
    orderBy: { displayName: 'asc' },
  })

  // Total lessons per wiki
  const lessonCounts = await prisma.lesson.groupBy({
    by: ['wikiSlug'],
    where: { wikiSlug: { in: slugs }, status: 'published' },
    _count: true,
  })

  // Completed lessons per wiki
  const completed = await prisma.lessonProgress.groupBy({
    by: ['wikiSlug'],
    where: { studentId: userId, wikiSlug: { in: slugs }, status: 'completed' },
    _count: true,
  })

  const progress: Record<string, { total: number; completed: number }> = {}
  for (const lc of lessonCounts) {
    progress[lc.wikiSlug] = { total: lc._count, completed: 0 }
  }
  for (const c of completed) {
    if (progress[c.wikiSlug]) progress[c.wikiSlug].completed = c._count
    else progress[c.wikiSlug] = { total: 0, completed: c._count }
  }

  return { wikis, progress }
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
      user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
      studentData={studentData}
      teacherData={teacherData}
    />
  )
}
