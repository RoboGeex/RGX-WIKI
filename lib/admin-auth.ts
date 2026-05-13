import { cookies } from 'next/headers'
import { getCurrentUser, AuthError } from '@/lib/auth'
import { findDeveloperById } from '@/lib/developers'

// Accepts either the new rgx_session cookie (User with role=admin)
// or the existing rgx_dev_id cookie (Developer) so the existing
// editor dashboard can call teacher-management APIs without a second login.
export async function requireAdminAccess() {
  // Try new auth first
  try {
    const user = await getCurrentUser()
    if (user?.role === 'admin') return { source: 'user' as const, user }
  } catch {
    // fall through
  }

  // Fall back to developer cookie
  const devId = cookies().get('rgx_dev_id')?.value
  if (devId) {
    const dev = await findDeveloperById(devId)
    if (dev) return { source: 'developer' as const, dev }
  }

  throw new AuthError('Admin access required', 403)
}
