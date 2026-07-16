import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireTrackActor } from '@/lib/track-auth'

export async function PATCH(request: Request, { params }: { params: { linkId: string } }) {
  try {
    const actor = await requireTrackActor()
    const link = await prisma.trackInviteLink.findUnique({ where: { id: params.linkId } })
    if (!link) throw new AuthError('Link not found', 404)
    if (!actor.isAdmin && link.createdByActorId !== actor.id) throw new AuthError('Forbidden', 403)
    const body = await request.json().catch(() => ({}))
    const active = body?.active !== false

    const updated = await prisma.trackInviteLink.update({
      where: { id: link.id },
      data: { isActive: active, disabledAt: active ? null : new Date() },
    })
    if (!active) {
      // Only assignments made through this exact link are revoked. Manual
      // assignments and assignments from other teachers remain intact.
      await prisma.trackAssignment.deleteMany({ where: { linkId: link.id } })
    }
    return NextResponse.json({ link: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update link' }, { status: error instanceof AuthError ? error.status : 500 })
  }
}
