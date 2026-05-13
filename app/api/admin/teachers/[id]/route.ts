import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/admin-auth'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminAccess()
    const body = await request.json()

    const teacher = await prisma.user.findUnique({ where: { id: params.id } })
    if (!teacher || teacher.role !== 'teacher') {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    const data: Record<string, any> = {}

    if (typeof body?.disabled === 'boolean') {
      data.disabledAt = body.disabled ? new Date() : null
      if (body.disabled) {
        await prisma.session.deleteMany({ where: { userId: teacher.id } })
      }
    }

    if (Array.isArray(body?.assignedWikiSlugs)) {
      data.assignedWikiSlugs = body.assignedWikiSlugs
    }

    const updated = await prisma.user.update({
      where: { id: teacher.id },
      data,
      select: { id: true, email: true, name: true, assignedWikiSlugs: true, disabledAt: true, createdAt: true },
    })

    return NextResponse.json({ teacher: updated })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 400
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
