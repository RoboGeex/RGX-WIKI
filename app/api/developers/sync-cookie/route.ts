import { NextResponse } from 'next/server'
import { getVerifiedDeveloperId } from '@/lib/dev-session'

/**
 * POST /api/developers/sync-cookie
 *
 * Historically this endpoint stamped the `rgx_dev_id` cookie from an
 * unauthenticated `x-developer-id` header — which let anyone impersonate any
 * developer by guessing an id. It no longer does that.
 *
 * The signed `rgx_dev_id` cookie is now issued at login. This endpoint simply
 * reports whether the current request carries a valid developer session, so
 * WikiAccessGate can decide whether the server-side access check has an
 * identity to work with. It never writes identity from a client-supplied value.
 */
export async function POST() {
  const devId = getVerifiedDeveloperId()
  if (!devId) {
    return NextResponse.json({ ok: false, valid: false, stamped: false }, { status: 401 })
  }
  return NextResponse.json({ ok: true, valid: true, stamped: false })
}
