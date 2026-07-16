import { notFound, redirect } from 'next/navigation'
import { Cairo } from 'next/font/google'
import { hasSuperadminAccess, requireAdminAccess } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import TeacherProfileClient, { type TeacherProfileData } from './TeacherProfileClient'

export const dynamic = 'force-dynamic'

const display = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-cairo' })

export default async function TeacherProfilePage({ params }: { params: { id: string } }) {
  let auth: Awaited<ReturnType<typeof requireAdminAccess>>
  try {
    auth = await requireAdminAccess()
  } catch {
    redirect(`/login?redirect=/dashboard/teachers/${params.id}`)
  }

  const teacher = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
      assignedWikiSlugs: true,
      disabledAt: true,
      createdAt: true,
      updatedAt: true,
      createdByName: true,
      createdByEmail: true,
    },
  })
  if (!teacher || teacher.role !== 'teacher') notFound()
  const canResetPassword = await hasSuperadminAccess()

  const assignedWikiSlugs = Array.isArray(teacher.assignedWikiSlugs)
    ? teacher.assignedWikiSlugs.filter((slug): slug is string => typeof slug === 'string')
    : []

  const [links, enrollments, allWikis] = await Promise.all([
    prisma.enrollmentLink.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { enrollments: true } } },
    }),
    prisma.enrollment.findMany({
      where: { teacherId: teacher.id },
      orderBy: { joinedAt: 'desc' },
      include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    }),
    prisma.wiki.findMany({ orderBy: { displayName: 'asc' }, select: { slug: true, displayName: true } }),
  ])

  const studentIds = [...new Set(enrollments.map(e => e.studentId))]
  const wikiSlugs = [...new Set([...assignedWikiSlugs, ...links.map(l => l.wikiSlug), ...enrollments.map(e => e.wikiSlug)])]
  const [lessons, progressRows, lastSession] = await Promise.all([
    wikiSlugs.length
      ? prisma.lesson.findMany({ where: { wikiSlug: { in: wikiSlugs }, status: 'published' }, select: { id: true, wikiSlug: true } })
      : Promise.resolve([]),
    studentIds.length
      ? prisma.lessonProgress.findMany({
          where: { studentId: { in: studentIds }, ...(wikiSlugs.length && { wikiSlug: { in: wikiSlugs } }) },
          select: { studentId: true, wikiSlug: true, lessonId: true, status: true, lastViewedAt: true, completedAt: true },
        })
      : Promise.resolve([]),
    prisma.session.findFirst({ where: { userId: teacher.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
  ])

  const wikiNames = new Map(allWikis.map(w => [w.slug, w.displayName]))
  const lessonCounts = new Map<string, number>()
  for (const lesson of lessons) lessonCounts.set(lesson.wikiSlug, (lessonCounts.get(lesson.wikiSlug) ?? 0) + 1)

  const enrollmentHistory = enrollments.map(enrollment => {
    const rows = progressRows.filter(p => p.studentId === enrollment.studentId && p.wikiSlug === enrollment.wikiSlug)
    const completed = rows.filter(p => p.status === 'completed').length
    const inProgress = rows.filter(p => p.status === 'in_progress').length
    const lastActivity = rows.map(p => p.lastViewedAt).sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    return {
      id: enrollment.id,
      wikiSlug: enrollment.wikiSlug,
      wikiName: wikiNames.get(enrollment.wikiSlug) ?? enrollment.wikiSlug,
      status: enrollment.status,
      joinedAt: enrollment.joinedAt,
      removedAt: enrollment.removedAt,
      student: enrollment.student,
      completed,
      inProgress,
      total: lessonCounts.get(enrollment.wikiSlug) ?? 0,
      lastActivity,
    }
  })

  const profile = JSON.parse(JSON.stringify({
    teacher: { ...teacher, assignedWikiSlugs },
    allWikis,
    links: links.map(link => ({
      id: link.id,
      wikiSlug: link.wikiSlug,
      wikiName: wikiNames.get(link.wikiSlug) ?? link.wikiSlug,
      isActive: link.isActive,
      createdAt: link.createdAt,
      disabledAt: link.disabledAt,
      enrollmentCount: link._count.enrollments,
    })),
    enrollmentHistory,
    lastLoginAt: lastSession?.createdAt ?? null,
    canResetPassword,
  })) as TeacherProfileData

  return (
    <div
      className={`${display.variable} rgx-dash min-h-screen text-[#0F172A]`}
      style={{
        background:
          'radial-gradient(circle at 10% 0%, rgba(240,82,63,0.08), transparent 38%), radial-gradient(circle at 92% 4%, rgba(240,82,63,0.06), transparent 36%), linear-gradient(180deg, #FDF6F4 0%, #FBF7F5 100%)',
      }}
    >
      <main className="px-4 pb-28 pt-[88px] sm:px-6 lg:ml-[272px] lg:px-10 lg:pb-8 lg:pt-10">
        <div className="mx-auto max-w-7xl"><TeacherProfileClient profile={profile} /></div>
      </main>
    </div>
  )
}
