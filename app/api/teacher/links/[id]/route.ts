import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/auth'

// PATCH /api/teacher/links/:id  { active: false } — disable link and revoke all enrollments
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const teacher = await requireRole('admin', 'teacher')
    const body = await request.json()
    const active = body?.active !== false // default true; pass false to disable

    const link = await prisma.enrollmentLink.findUnique({ where: { id: params.id } })
    if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    if (link.teacherId !== teacher.id && teacher.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.enrollmentLink.update({
      where: { id: link.id },
      data: { isActive: active, disabledAt: active ? null : new Date() },
    })

    // Disabling revokes all active enrollments through this link
    if (!active) {
      await prisma.enrollment.updateMany({
        where: { linkId: link.id, status: 'active' },
        data: { status: 'revoked', removedAt: new Date() },
      })
    }

    return NextResponse.json({ link: updated })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
