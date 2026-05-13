import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import TeacherDashboardClient from './TeacherDashboardClient'

export default async function TeacherPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/teacher')
  if (user.role !== 'teacher' && user.role !== 'admin') redirect('/')

  const teacherRecord = await prisma.user.findUnique({ where: { id: user.id } })
  const assigned: string[] = Array.isArray(teacherRecord?.assignedWikiSlugs)
    ? (teacherRecord.assignedWikiSlugs as string[])
    : []

  // Admins see all wikis. Teachers only see what they've been assigned.
  // If a teacher has no assignments yet, they see nothing.
  const wikis = user.role === 'admin'
    ? await prisma.wiki.findMany({
        where: { isPublished: true },
        orderBy: { displayName: 'asc' },
        select: { slug: true, displayName: true },
      })
    : assigned.length > 0
      ? await prisma.wiki.findMany({
          where: { isPublished: true, slug: { in: assigned } },
          orderBy: { displayName: 'asc' },
          select: { slug: true, displayName: true },
        })
      : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teacher dashboard</h1>
            <p className="text-sm text-gray-500">Signed in as {user.email}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="text-sm text-gray-500 hover:text-gray-900">Sign out</button>
          </form>
        </header>

        <TeacherDashboardClient wikis={wikis} />
      </div>
    </div>
  )
}
