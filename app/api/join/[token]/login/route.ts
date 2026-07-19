import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession, setSessionCookie, verifyPassword } from '@/lib/auth'
import { classStatus, closedReason } from '@/lib/class-window'

// POST /api/join/:token/login   { studentId, password }
//
// "Pick your name" sign-in for the invite page: a student a teacher already
// added to this class selects themselves and only types a password, so they
// never need to remember which email the teacher used.
//
// Deliberately scoped: it authenticates ONLY a student holding an active
// enrollment on this exact invite link, so it cannot be used as a general
// login oracle, and it never accepts an email — just the opaque id the roster
// endpoint returned. Failures share one generic message so the endpoint can't
// be used to probe which accounts exist.
export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const body = await request.json()
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!studentId || !password) {
      return NextResponse.json({ error: 'Select your name and enter your password' }, { status: 400 })
    }

    const link = await prisma.enrollmentLink.findUnique({ where: { token: params.token } })
    if (!link) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
    const status = classStatus(link)
    if (status !== 'active') {
      return NextResponse.json({ error: closedReason(status) }, { status: 403 })
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { linkId: link.id, studentId, status: 'active' },
      select: { id: true },
    })
    const user = enrollment
      ? await prisma.user.findUnique({ where: { id: studentId } })
      : null

    const invalid = () => NextResponse.json({ error: 'Incorrect password. Try again.' }, { status: 401 })
    if (!enrollment || !user || user.disabledAt || user.role !== 'student') return invalid()
    if (!(await verifyPassword(password, user.passwordHash))) return invalid()

    const { token, expiresAt } = await createSession(user.id)
    setSessionCookie(token, expiresAt)

    return NextResponse.json({ ok: true, wikiSlug: link.wikiSlug })
  } catch (e) {
    console.error('join pick-your-name login failed:', e)
    return NextResponse.json({ error: 'Sign in failed' }, { status: 500 })
  }
}
