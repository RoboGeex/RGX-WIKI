import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireTrackActor } from '@/lib/track-auth'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireTrackActor()
    const track = await prisma.track.findUnique({ where: { id: params.id }, include: { wikis: true } })
    if (!track) throw new AuthError('Track not found', 404)
    if (!actor.isAdmin && track.wikis.some((wiki) => !actor.wikiSlugs.includes(wiki.wikiSlug))) {
      throw new AuthError('You need access to every wiki in this track before generating a link', 403)
    }

    // Replacing a link stops new joins through the old URL. Existing students
    // keep their assignment, matching the normal wiki-link behavior.
    await prisma.trackInviteLink.updateMany({
      where: { trackId: track.id, createdByActorId: actor.id, isActive: true },
      data: { isActive: false, disabledAt: new Date() },
    })

    const link = await prisma.trackInviteLink.create({
      data: {
        token: randomBytes(24).toString('hex'),
        trackId: track.id,
        createdByActorId: actor.id,
        createdByUserId: actor.userId,
        createdByName: actor.name,
        createdByEmail: actor.email,
      },
      include: { _count: { select: { assignments: true } } },
    })
    return NextResponse.json({ link }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to generate link' }, { status: error instanceof AuthError ? error.status : 500 })
  }
}
