import { redirect } from 'next/navigation'
import AdminDashboardShell from './AdminDashboardShell'
import { loadDashboardShellProps } from './load-dashboard-shell-props'

// Always reflect the latest data — never statically cache.
export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string | string[] }
}) {
  // Backward-compat: the dashboard briefly used ?tab= for the students/teachers
  // tabs. Send any such links to their canonical clean path.
  const tab = Array.isArray(searchParams?.tab) ? searchParams?.tab[0] : searchParams?.tab
  if (tab === 'students') redirect('/dashboard/students')
  if (tab === 'teachers') redirect('/dashboard/teachers')

  const props = await loadDashboardShellProps('overview', '/dashboard')
  return <AdminDashboardShell {...props} />
}
