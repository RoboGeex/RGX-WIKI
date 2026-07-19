import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/auth'
import { endOfDay, startOfDay } from '@/lib/class-window'

// PATCH /api/teacher/links/:id — update a class (link). Supported operations:
//   { active: false }      — turn the class link off and revoke its enrollments
//   { active: true }       — turn it back on
//   { name: "Grade 5A" }   — rename the class (empty string clears the name)
//   { regenerate: true }   — issue a new token (old invite URL stops working;
//                            enrolled students keep access, since enrollments
//                            reference the link id, not the token)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const teacher = await requireRole('admin', 'teacher')
    const body = await request.json()

    const link = await prisma.enrollmentLink.findUnique({ where: { id: params.id } })
    if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    if (link.teacherId !== teacher.id && teacher.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data: {
      isActive?: boolean
      disabledAt?: Date | null
      name?: string | null
      token?: string
      startsAt?: Date | null
      endsAt?: Date | null
    } = {}

    // Schedule. Pass "" (or null) to clear a date.
    if (body?.startsAt !== undefined) {
      data.startsAt = typeof body.startsAt === 'string' && body.startsAt ? startOfDay(body.startsAt) : null
    }
    if (body?.endsAt !== undefined) {
      data.endsAt = typeof body.endsAt === 'string' && body.endsAt ? endOfDay(body.endsAt) : null
    }
    const nextStart = data.startsAt !== undefined ? data.startsAt : link.startsAt
    const nextEnd = data.endsAt !== undefined ? data.endsAt : link.endsAt
    if (nextStart && nextEnd && nextEnd < nextStart) {
      return NextResponse.json({ error: 'The end date must be after the start date' }, { status: 400 })
    }

    // Active toggle (only when the caller explicitly sends `active`)
    const hasActive = typeof body?.active === 'boolean'
    const active = body?.active !== false
    if (hasActive) {
      data.isActive = active
      data.disabledAt = active ? null : new Date()
    }

    // Rename
    if (typeof body?.name === 'string') {
      const trimmed = body.name.trim().slice(0, 120)
      data.name = trimmed || null
    }

    // Regenerate token
    if (body?.regenerate === true) {
      data.token = randomBytes(24).toString('hex')
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
    }

    const updated = await prisma.enrollmentLink.update({
      where: { id: link.id },
      data,
    })

    // Disabling revokes all active enrollments through this link
    if (hasActive && !active) {
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
