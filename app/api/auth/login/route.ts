import { NextResponse } from 'next/server'
import { authenticate, createSession, SESSION_COOKIE } from '@/lib/auth'
import { findDeveloperByCredentials } from '@/lib/developers'

const COOKIE_OPTS = (expiresAt?: Date) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  ...(expiresAt ? { expires: expiresAt } : { maxAge: 60 * 60 * 24 * 30 }),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // ── 1. Try the new User table (admin / teacher / student) ──────────────
    const user = await authenticate(email, password)
    if (user) {
      const { token, expiresAt } = await createSession(user.id)
      const res = NextResponse.json({
        ok: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      })
      // Set cookie directly on the response — same pattern as developer login
      res.cookies.set(SESSION_COOKIE, token, COOKIE_OPTS(expiresAt))
      return res
    }

    // ── 2. Fall back to the Developer (editor) table ───────────────────────
    const dev = await findDeveloperByCredentials(email, password)
    if (dev) {
      const res = NextResponse.json({
        ok: true,
        user: { id: String(dev.id), email: dev.email, name: dev.name ?? null, role: 'editor' },
        developerId: String(dev.id),
      })
      res.cookies.set('rgx_dev_id', String(dev.id), COOKIE_OPTS())
      return res
    }

    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Login failed' }, { status: 500 })
  }
}
