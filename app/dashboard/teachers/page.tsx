import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/lib/admin-auth'
import AdminNavbar from '../../../components/admin-navbar'
import { prisma } from '@/lib/prisma'
import { getAdminTeachersList } from '@/lib/admin-teachers'
import TeachersPageClient from './TeachersPageClient'

// Always reflect the latest teacher data — never statically cache.
export const dynamic = 'force-dynamic'

function getInitials(name: string | null | undefined, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default async function TeachersPage() {
  let userInitials = 'AD'
  let isAdmin = false
  try {
    const auth = await requireAdminAccess()
    isAdmin = true
    if (auth.source === 'user') userInitials = getInitials(auth.user.name, auth.user.email)
    else if (auth.source === 'developer') userInitials = getInitials(auth.dev.name ?? null, auth.dev.email ?? '')
  } catch { /* */ }
  if (!isAdmin) redirect('/login?redirect=/dashboard/teachers')

  const wikis = await prisma.wiki.findMany({
    where: { isPublished: true },
    orderBy: { displayName: 'asc' },
    select: { slug: true, displayName: true },
  }).catch(() => [])

  // Pre-load the teacher list on the server so the page arrives with data
  // instead of a spinner. On failure we pass null and the client falls back to
  // fetching on mount (its original behavior) — a pure upgrade.
  let initialTeachers: any = null
  try {
    initialTeachers = JSON.parse(JSON.stringify(await getAdminTeachersList()))
  } catch {
    initialTeachers = null
  }

  return (
    <div className="min-h-screen bg-[#f5f5f4]">
      <AdminNavbar userInitials={userInitials} />
      <div className="dashboard-text-scale mx-auto max-w-7xl px-6 pt-20 pb-12">
        <TeachersPageClient wikis={wikis} initialTeachers={initialTeachers} />
      </div>
    </div>
  )
}
