import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SESSION_COOKIE, clearSessionCookie, destroySession } from '@/lib/auth'

export async function POST() {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (token) await destroySession(token)
  clearSessionCookie()
  return NextResponse.json({ ok: true })
}
