import { NextResponse } from 'next/server'
import { sessionCookieDomain } from '@/lib/auth'

export async function POST() {
  const domain = sessionCookieDomain()
  const clearOpts = { maxAge: 0, path: '/', ...(domain ? { domain } : {}) }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('rgx_session', '', clearOpts)
  res.cookies.set('rgx_dev_id', '', clearOpts)
  return res
}
