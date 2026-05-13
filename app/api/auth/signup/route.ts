import { NextResponse } from 'next/server'
import { createSession, createUser, setSessionCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const name = typeof body?.name === 'string' ? body.name : undefined

    // Public signup is for students only. Teachers/admins are created
    // by an admin via the admin dashboard.
    const user = await createUser({ email, password, name, role: 'student' })
    const { token, expiresAt } = await createSession(user.id)
    setSessionCookie(token, expiresAt)

    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Signup failed' }, { status: 400 })
  }
}
