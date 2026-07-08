import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getAdminStats, getAdminPeople, getWikiHealth } from '@/lib/admin-dashboard'
import { getAdminStudentsList } from '@/lib/admin-students'
import { getAdminTeachersList } from '@/lib/admin-teachers'
import AdminDashboardShell from './AdminDashboardShell'
import type { DashboardTab } from '@/components/admin-navbar'

// Always reflect the latest data — never statically cache.
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

function parseTab(value: string | string[] | undefined): DashboardTab {
  const v = Array.isArray(value) ? value[0] : value
  return v === 'students' || v === 'teachers' ? v : 'overview'
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string | string[] }
}) {
  let userInitials = 'AD'
  let isAdmin = false
  try {
    const auth = await requireAdminAccess()
    isAdmin = true
    if (auth.source === 'user') userInitials = getInitials(auth.user.name, auth.user.email)
    else if (auth.source === 'developer') userInitials = getInitials(auth.dev.name ?? null, auth.dev.email ?? '')
  } catch { /* not authorised */ }

  if (!isAdmin) redirect('/login?redirect=/dashboard')

  // Load every tab's data once, in parallel, on the server. Holding it all in
  // the client shell is what makes tab switching instant (no per-tab
  // navigation/refetch). Any dataset that fails passes null and its tab's
  // client falls back to fetching on mount — a graceful degrade.
  const [stats, people, wikiHealth, students, teachers, wikis] = await Promise.all([
    getAdminStats().catch(() => null),
    getAdminPeople().catch(() => null),
    getWikiHealth().catch(() => null),
    getAdminStudentsList(false).catch(() => null),
    getAdminTeachersList().catch(() => null),
    prisma.wiki.findMany({
      where: { isPublished: true },
      orderBy: { displayName: 'asc' },
      select: { slug: true, displayName: true },
    }).catch(() => []),
  ])
  const serialize = (v: unknown) => (v == null ? null : JSON.parse(JSON.stringify(v)))

  return (
    <AdminDashboardShell
      userInitials={userInitials}
      initialTab={parseTab(searchParams?.tab)}
      stats={serialize(stats)}
      people={serialize(people)}
      wikiHealth={serialize(wikiHealth)}
      students={serialize(students)}
      teachers={serialize(teachers)}
      wikis={serialize(wikis) ?? []}
    />
  )
}
