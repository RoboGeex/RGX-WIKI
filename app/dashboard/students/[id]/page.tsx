import { notFound, redirect } from 'next/navigation'
import { Cairo } from 'next/font/google'
import { requireAdminAccess } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import StudentProfileClient, { type StudentProfileData } from './StudentProfileClient'

export const dynamic = 'force-dynamic'

const display = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-cairo' })

export default async function StudentProfilePage({ params }: { params: { id: string } }) {
  let auth: Awaited<ReturnType<typeof requireAdminAccess>>
  try {
    auth = await requireAdminAccess()
  } catch {
    redirect(`/login?redirect=/dashboard/students/${params.id}`)
  }

  const student = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true, updatedAt: true, disabledAt: true },
  })
  if (!student || student.role !== 'student') notFound()

  const [enrollments, progressRows] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId: student.id },
      orderBy: { joinedAt: 'desc' },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        link: { select: { id: true, token: true, isActive: true, disabledAt: true, createdAt: true } },
      },
    }),
    prisma.lessonProgress.findMany({
      where: { studentId: student.id },
      select: { lessonId: true, wikiSlug: true, status: true, completedAt: true, lastViewedAt: true },
    }),
  ])

  const wikiSlugs = [...new Set([...enrollments.map(e => e.wikiSlug), ...progressRows.map(p => p.wikiSlug)])]
  const [wikis, lessons] = await Promise.all([
    wikiSlugs.length
      ? prisma.wiki.findMany({ where: { slug: { in: wikiSlugs } }, select: { slug: true, displayName: true } })
      : Promise.resolve([]),
    wikiSlugs.length
      ? prisma.lesson.findMany({
          where: { wikiSlug: { in: wikiSlugs }, status: 'published' },
          orderBy: [{ wikiSlug: 'asc' }, { order: 'asc' }],
          select: { id: true, wikiSlug: true, title_en: true, order: true },
        })
      : Promise.resolve([]),
  ])

  const wikiNames = new Map(wikis.map(w => [w.slug, w.displayName]))
  const lessonsByWiki = new Map<string, typeof lessons>()
  for (const lesson of lessons) {
    const list = lessonsByWiki.get(lesson.wikiSlug) ?? []
    list.push(lesson)
    lessonsByWiki.set(lesson.wikiSlug, list)
  }
  const progressByLesson = new Map(progressRows.map(p => [p.lessonId, p]))

  const history = enrollments.map(enrollment => {
    const wikiLessons = lessonsByWiki.get(enrollment.wikiSlug) ?? []
    const completed = wikiLessons.filter(lesson => progressByLesson.get(lesson.id)?.status === 'completed').length
    const inProgress = wikiLessons.filter(lesson => progressByLesson.get(lesson.id)?.status === 'in_progress').length
    const lastActivity = progressRows
      .filter(p => p.wikiSlug === enrollment.wikiSlug)
      .map(p => p.lastViewedAt)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
    return {
      id: enrollment.id,
      wikiSlug: enrollment.wikiSlug,
      wikiName: wikiNames.get(enrollment.wikiSlug) ?? enrollment.wikiSlug,
      status: enrollment.status,
      joinedAt: enrollment.joinedAt,
      removedAt: enrollment.removedAt,
      linkActive: enrollment.link.isActive,
      linkDisabledAt: enrollment.link.disabledAt,
      teacher: enrollment.teacher,
      completed,
      inProgress,
      total: wikiLessons.length,
      lastActivity,
    }
  })

  const profile = JSON.parse(JSON.stringify({
    student,
    history,
    wikiOptions: wikiSlugs.map(slug => ({ slug, displayName: wikiNames.get(slug) ?? slug })).sort((a, b) => a.displayName.localeCompare(b.displayName)),
  })) as StudentProfileData

  return (
    <div
      className={`${display.variable} rgx-dash min-h-screen text-[#0F172A]`}
      style={{
        background:
          'radial-gradient(circle at 10% 0%, rgba(240,82,63,0.08), transparent 38%), radial-gradient(circle at 92% 4%, rgba(240,82,63,0.06), transparent 36%), linear-gradient(180deg, #FDF6F4 0%, #FBF7F5 100%)',
      }}
    >
      <main className="px-4 pb-28 pt-[88px] sm:px-6 lg:ml-[272px] lg:px-10 lg:pb-8 lg:pt-10">
        <div className="mx-auto max-w-7xl"><StudentProfileClient profile={profile} /></div>
      </main>
    </div>
  )
}
