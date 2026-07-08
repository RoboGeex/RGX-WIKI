import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getAdminStats, getAdminPeople, getWikiHealth } from '@/lib/admin-dashboard'
import { getAdminStudentsList } from '@/lib/admin-students'
import { getAdminTeachersList } from '@/lib/admin-teachers'
import type { DashboardTab } from '@/components/admin-navbar'

function getInitials(name: string | null | undefined, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const serialize = (v: unknown) => (v == null ? null : JSON.parse(JSON.stringify(v)))

// Shared by /dashboard, /dashboard/students, /dashboard/teachers — each is a
// real route (so direct hits, bookmarks, and refreshes work normally), but
// all three render the same AdminDashboardShell with every tab's data
// preloaded, so switching tabs afterward is pure client state.
export async function loadDashboardShellProps(initialTab: DashboardTab, redirectPath: string) {
  let userInitials = 'AD'
  let userAvatarUrl: string | null = null
  let userName: string | null = null
  let userEmail: string | null = null
  let isAdmin = false
  try {
    const auth = await requireAdminAccess()
    isAdmin = true
    if (auth.source === 'user') {
      userInitials = getInitials(auth.user.name, auth.user.email)
      userAvatarUrl = auth.user.avatarUrl
      userName = auth.user.name
      userEmail = auth.user.email
    } else if (auth.source === 'developer') {
      userInitials = getInitials(auth.dev.name ?? null, auth.dev.email ?? '')
      userName = auth.dev.name ?? null
      userEmail = auth.dev.email ?? null
    }
  } catch { /* not authorised */ }

  if (!isAdmin) redirect(`/login?redirect=${redirectPath}`)

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

  return {
    userInitials,
    userAvatarUrl,
    userName,
    userEmail,
    initialTab,
    stats: serialize(stats),
    people: serialize(people),
    wikiHealth: serialize(wikiHealth),
    students: serialize(students),
    teachers: serialize(teachers),
    wikis: serialize(wikis) ?? [],
  }
}
