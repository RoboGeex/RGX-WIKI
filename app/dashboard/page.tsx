import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/lib/admin-auth'
import { getAdminStats, getAdminPeople, getWikiHealth } from '@/lib/admin-dashboard'
import AdminNavbar from '../../components/admin-navbar'
import DashboardHome from './DashboardHome'

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

export default async function DashboardPage() {
  let userInitials = 'AD'
  let isAdmin = false
  try {
    const auth = await requireAdminAccess()
    isAdmin = true
    if (auth.source === 'user') userInitials = getInitials(auth.user.name, auth.user.email)
    else if (auth.source === 'developer') userInitials = getInitials(auth.dev.name ?? null, auth.dev.email ?? '')
  } catch { /* not authorised */ }

  if (!isAdmin) redirect('/login?redirect=/dashboard')

  // Pre-load the dashboard datasets on the server so cards and tables arrive
  // with data instead of skeletons. Each is independent; any that fails passes
  // null and the client fetches it on mount (original behavior) — a pure upgrade.
  const [initialStats, initialPeople, initialWikiHealth] = await Promise.all([
    getAdminStats().catch(() => null),
    getAdminPeople().catch(() => null),
    getWikiHealth().catch(() => null),
  ])
  const serialize = (v: unknown) => (v == null ? null : JSON.parse(JSON.stringify(v)))

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(circle at 10% 0%, rgba(240,82,63,0.08), transparent 38%), radial-gradient(circle at 92% 4%, rgba(240,82,63,0.06), transparent 36%), linear-gradient(180deg, #FDF6F4 0%, #FBF7F5 100%)',
      }}
    >
      <AdminNavbar userInitials={userInitials} />
      <div className="w-full max-w-[1400px] mx-auto px-6 pt-[96px] pb-14">
        <DashboardHome
          initialStats={serialize(initialStats)}
          initialPeople={serialize(initialPeople)}
          initialWikiHealth={serialize(initialWikiHealth)}
        />
      </div>
    </div>
  )
}
