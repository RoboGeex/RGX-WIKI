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
    <TeacherDashboardClient
      wikis={wikis}
      user={{ name: user.name, email: user.email }}
    />
  )
}
