import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, getCurrentUser } from '@/lib/auth'

// PATCH /api/auth/profile  { name, phone, school }
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) throw new AuthError('Not signed in', 401)

    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : undefined

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { ...(name !== undefined && { name: name || null }) },
      select: { id: true, email: true, name: true, role: true },
    })

    return NextResponse.json({ ok: true, user: updated })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
