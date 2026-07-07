import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'
import { getAdminStats } from '@/lib/admin-dashboard'

export async function GET() {
  try {
    await requireAdminAccess()

    if (process.env.NODE_ENV !== 'production' && process.env.USE_DB !== 'true') {
      return NextResponse.json({
        teachers: 0,
        students: 0,
        wikis: 0,
        activeSessions: 0,
        admins: 0,
        developerCount: 1,
      })
    }

    return NextResponse.json(await getAdminStats())
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
