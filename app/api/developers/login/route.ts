import { NextResponse } from 'next/server'
import { findDeveloperByCredentials } from '@/lib/developers'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const email = typeof payload?.email === 'string' ? payload.email.trim() : ''
    const password = typeof payload?.password === 'string' ? payload.password.trim() : ''
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const dev = await findDeveloperByCredentials(email, password)
    if (!dev) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const res = NextResponse.json({
      ok: true,
      developer: {
        id: dev.id,
        email: dev.email,
        name: dev.name,
        role: dev.role,
        wikiSlugs: dev.wikiSlugs || [],
        lessonIds: dev.lessonIds || [],
      },
    })

    // Set an HTTP-only cookie so server components can verify identity
    // and enforce wiki-level access control without a client round-trip.
    res.cookies.set('rgx_dev_id', String(dev.id), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Login failed' }, { status: 500 })
  }
}
