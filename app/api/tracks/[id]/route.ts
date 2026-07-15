import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertTrackScope, requireTrackActor } from '@/lib/track-auth'

function strings(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))] : []
}

async function editableTrack(id: string) {
  const actor = await requireTrackActor()
  const track = await prisma.track.findUnique({ where: { id } })
  if (!track) throw new AuthError('Track not found', 404)
  if (!actor.isAdmin && track.createdByUserId !== actor.id) throw new AuthError('You cannot edit this track', 403)
  return { actor, track }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { actor } = await editableTrack(params.id)
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const wikiSlugs = strings(body?.wikiSlugs)
    const studentIds = strings(body?.studentIds)
    if (!name) throw new AuthError('Track name is required', 400)
    if (!wikiSlugs.length) throw new AuthError('Select at least one wiki', 400)
    await assertTrackScope(actor, wikiSlugs, studentIds)

    await prisma.$transaction(async (tx) => {
      await tx.track.update({ where: { id: params.id }, data: { name, description: description || null } })
      await tx.trackWiki.deleteMany({ where: { trackId: params.id } })
      await tx.trackAssignment.deleteMany({ where: { trackId: params.id } })
      await tx.trackWiki.createMany({ data: wikiSlugs.map((wikiSlug, position) => ({ trackId: params.id, wikiSlug, position })) })
      if (studentIds.length) await tx.trackAssignment.createMany({ data: studentIds.map((studentId) => ({ trackId: params.id, studentId, assignedByUserId: actor.userId })) })
    })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update track' }, { status: error instanceof AuthError ? error.status : 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await editableTrack(params.id)
    await prisma.track.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete track' }, { status: error instanceof AuthError ? error.status : 500 })
  }
}
