import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/auth'

// DELETE /api/teacher/students/:enrollmentId — remove a student
export async function DELETE(_: Request, { params }: { params: { enrollmentId: string } }) {
  try {
    const teacher = await requireRole('admin', 'teacher')

    const enrollment = await prisma.enrollment.findUnique({ where: { id: params.enrollmentId } })
    if (!enrollment) return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    if (enrollment.teacherId !== teacher.id && teacher.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (enrollment.status !== 'active') {
      return NextResponse.json({ error: 'Already removed' }, { status: 400 })
    }

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'removed', removedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const status = e instanceof AuthError ? e.status : 500
    return NextResponse.json({ error: e?.message || 'Failed' }, { status })
  }
}
