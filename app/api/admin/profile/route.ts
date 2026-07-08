import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, hashPassword, verifyPassword } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'
import { getDevelopersPrisma } from '@/lib/prisma-developers'

function cleanEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : undefined
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : undefined
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function GET() {
  try {
    const auth = await requireAdminAccess()
    if (auth.source === 'user') {
      return NextResponse.json({
        ok: true,
        account: {
          source: 'user',
          id: auth.user.id,
          name: auth.user.name,
          email: auth.user.email,
          avatarUrl: auth.user.avatarUrl,
          canUploadAvatar: true,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      account: {
        source: 'developer',
        id: String(auth.dev.id),
        name: auth.dev.name ?? null,
        email: auth.dev.email,
        avatarUrl: null,
        canUploadAvatar: false,
      },
    })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdminAccess()
    const body = await request.json()
    const name = cleanText(body?.name)
    const email = cleanEmail(body?.email)
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

    if (email !== undefined && (!email || !isEmail(email))) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }
    if (newPassword && newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    if (auth.source === 'user') {
      const current = await prisma.user.findUnique({
        where: { id: auth.user.id },
        select: { id: true, passwordHash: true },
      })
      if (!current) throw new AuthError('Not signed in', 401)

      const data: { name?: string | null; email?: string; passwordHash?: string } = {}
      if (name !== undefined) data.name = name || null
      if (email !== undefined) data.email = email
      if (newPassword) {
        if (!currentPassword || !(await verifyPassword(currentPassword, current.passwordHash))) {
          return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
        }
        data.passwordHash = await hashPassword(newPassword)
      }

      const updated = await prisma.user.update({
        where: { id: auth.user.id },
        data,
        select: { id: true, email: true, name: true, avatarUrl: true },
      })

      return NextResponse.json({
        ok: true,
        account: { source: 'user', ...updated, canUploadAvatar: true },
      })
    }

    const numericId = Number(auth.dev.id)
    if (!Number.isFinite(numericId)) {
      return NextResponse.json({ error: 'Local developer profiles cannot be edited here.' }, { status: 400 })
    }

    const devDb = getDevelopersPrisma()
    const current = await devDb.developer.findUnique({
      where: { id: numericId },
      select: { id: true, password: true },
    })
    if (!current) throw new AuthError('Not signed in', 401)

    const data: { name?: string | null; email?: string; password?: string } = {}
    if (name !== undefined) data.name = name || null
    if (email !== undefined) data.email = email
    if (newPassword) {
      if (!currentPassword || current.password !== currentPassword.trim()) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
      }
      data.password = newPassword
    }

    const updated = await devDb.developer.update({
      where: { id: numericId },
      data,
      select: { id: true, email: true, name: true },
    })

    return NextResponse.json({
      ok: true,
      account: {
        source: 'developer',
        id: String(updated.id),
        email: updated.email,
        name: updated.name,
        avatarUrl: null,
        canUploadAvatar: false,
      },
    })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : e?.code === 'P2002' ? 409 : 500
    const message = e?.code === 'P2002' ? 'That email is already in use.' : e?.message || 'Failed'
    return NextResponse.json({ error: message }, { status })
  }
}
