import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { cookies, headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export type Role = 'admin' | 'teacher' | 'student'

export const SESSION_COOKIE = 'rgx_session'
const SESSION_DAYS = 30

// Scope the session cookie to the parent domain so a login made on any
// robogeex.com subdomain (e.g. admin.robogeex.com) is recognized on the wiki
// hub (wiki.robogeex.com). Returns undefined for localhost / *.run.app /
// preview hosts, where a host-only cookie is correct.
export function sessionCookieDomain(): string | undefined {
  try {
    const host = (headers().get('host') || '').toLowerCase().split(':')[0]
    if (host === 'robogeex.com' || host.endsWith('.robogeex.com')) {
      return '.robogeex.com'
    }
  } catch {
    // headers() unavailable outside a request scope — fall back to host-only.
  }
  return undefined
}

export type SessionUser = {
  id: string
  email: string
  name: string | null
  role: Role
}

function newToken() {
  return randomBytes(32).toString('hex')
}

function expiryDate(days = SESSION_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

export async function createUser(input: {
  email: string
  password: string
  role: Role
  name?: string
}) {
  const email = input.email.trim().toLowerCase()
  if (!email || !input.password) throw new Error('Email and password are required')
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters')

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('Email is already registered')

  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      name: input.name?.trim() || null,
    },
  })
}

export async function authenticate(email: string, password: string) {
  const normalized = (email || '').trim().toLowerCase()
  if (!normalized || !password) return null
  const user = await prisma.user.findUnique({ where: { email: normalized } })
  if (!user || user.disabledAt) return null
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) return null
  return user
}

export async function createSession(userId: string) {
  const token = newToken()
  const expiresAt = expiryDate()
  await prisma.session.create({ data: { token, userId, expiresAt } })
  return { token, expiresAt }
}

export function setSessionCookie(token: string, expiresAt: Date) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    domain: sessionCookieDomain(),
    expires: expiresAt,
  })
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    domain: sessionCookieDomain(),
    maxAge: 0,
  })
}

export async function destroySession(token: string) {
  if (!token) return
  try {
    await prisma.session.deleteMany({ where: { token } })
  } catch {
    // ignore
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  if (session.user.disabledAt) return null

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as Role,
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new AuthError('Not signed in', 401)
  return user
}

export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  const user = await requireUser()
  if (!allowed.includes(user.role)) {
    throw new AuthError('Forbidden', 403)
  }
  return user
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}
