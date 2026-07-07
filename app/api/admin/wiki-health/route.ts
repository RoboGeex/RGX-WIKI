import { NextResponse } from 'next/server'
import { requireAdminAccess } from '@/lib/admin-auth'
import { AuthError } from '@/lib/auth'
import { getWikiHealth } from '@/lib/admin-dashboard'

export async function GET() {
  try {
    await requireAdminAccess()

    if (process.env.NODE_ENV !== 'production' && process.env.USE_DB !== 'true') {
      return NextResponse.json({ wikis: [], lessons: [] })
    }

    return NextResponse.json(await getWikiHealth())
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
