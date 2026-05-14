import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/lib/admin-auth'
import AdminNavbar from '../../../components/admin-navbar'
import { prisma } from '@/lib/prisma'
import TeachersPageClient from './TeachersPageClient'

export default async function TeachersPage() {
  let isAdmin = false
  try { await requireAdminAccess(); isAdmin = true } catch { /* */ }
  if (!isAdmin) redirect('/login?redirect=/dashboard/teachers')

  const wikis = await prisma.wiki.findMany({
    where: { isPublished: true },
    orderBy: { displayName: 'asc' },
    select: { slug: true, displayName: true },
  }).catch(() => [])

  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <AdminNavbar />
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-12">
        <TeachersPageClient wikis={wikis} />
      </div>
    </div>
  )
}
