import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'
import { getAdminPeople } from '@/lib/admin-dashboard'

export async function GET() {
  try {
    await requireAdminAccess()

    if (process.env.NODE_ENV !== 'production' && process.env.USE_DB !== 'true') {
      const now = new Date().toISOString()
      return NextResponse.json({
        admins: [],
        developers: [{
          source: 'developer',
          id: process.env.LOCAL_DEV_ID || 'local-dev',
          email: process.env.LOCAL_DEV_EMAIL || 'info@robogeex.com',
          name: process.env.LOCAL_DEV_NAME || 'Local Developer',
          avatarUrl: null,
          disabledAt: null,
          createdAt: now,
          lastLoginAt: null,
          activeSessions: null,
          role: 'superadmin',
        }],
      })
    }

    return NextResponse.json(await getAdminPeople())
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
