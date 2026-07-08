import AdminDashboardShell from '../AdminDashboardShell'
import { loadDashboardShellProps } from '../load-dashboard-shell-props'

// A real route (not a redirect) so bookmarks/refreshes/shared links land
// directly here. It renders the same shell as /dashboard, with every tab's
// data preloaded, so switching tabs afterward is pure client state.
export const dynamic = 'force-dynamic'

export default async function StudentsPage() {
  const props = await loadDashboardShellProps('students', '/dashboard/students')
  return <AdminDashboardShell {...props} />
}
