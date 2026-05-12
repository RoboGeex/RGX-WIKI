import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { findDeveloperById } from '@/lib/developers'

/**
 * POST /api/developers/sync-cookie
 *
 * Stamps the `rgx_dev_id` HTTP-only cookie from the caller's localStorage devId
 * (passed via the x-developer-id header).  Called by WikiAccessGate on mount so
 * that server components can enforce wiki-level access even for sessions that
 * pre-date the cookie being issued at login time.
 *
 * Returns { ok: true, stamped: true }  if the cookie was newly written, or
 *         { ok: true, stamped: false } if it was already present and correct.
 */
export async function POST(req: Request) {
  try {
    const devId =
      req.headers.get('x-developer-id') ||
      req.headers.get('x-dev-id') ||
      req.headers.get('x-actor-id') ||
      ''

    if (!devId.trim()) {
      return NextResponse.json({ error: 'Missing developer id' }, { status: 400 })
    }

    // Verify the developer actually exists before stamping anything
    const developer = await findDeveloperById(devId.trim())
    if (!developer) {
      return NextResponse.json({ error: 'Unknown developer' }, { status: 401 })
    }

    const existing = cookies().get('rgx_dev_id')?.value
    const alreadySet = existing === String(developer.id)

    if (!alreadySet) {
      const res = NextResponse.json({ ok: true, stamped: true })
      res.cookies.set('rgx_dev_id', String(developer.id), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
      return res
    }

    return NextResponse.json({ ok: true, stamped: false })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Sync failed' }, { status: 500 })
  }
}
