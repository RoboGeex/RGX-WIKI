import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertTrackScope, requireTrackActor } from '@/lib/track-auth'

function strings(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))] : []
}

async function findTrack(id: string) {
  const actor = await requireTrackActor()
  const track = await prisma.track.findUnique({ where: { id }, include: { wikis: true } })
  if (!track) throw new AuthError('Track not found', 404)
  return { actor, track }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { actor, track } = await findTrack(params.id)
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const wikiSlugs = strings(body?.wikiSlugs)
    const studentIds = strings(body?.studentIds)
    const canEditStructure = actor.isAdmin || track.createdByUserId === actor.id
    const effectiveWikis = canEditStructure ? wikiSlugs : track.wikis.sort((a, b) => a.position - b.position).map((wiki) => wiki.wikiSlug)
    if (canEditStructure && !name) throw new AuthError('Track name is required', 400)
    if (!effectiveWikis.length) throw new AuthError('Select at least one wiki', 400)
    await assertTrackScope(actor, effectiveWikis, studentIds, { allowSharedTrack: !canEditStructure })

    const eligibleStudentIds = actor.isAdmin ? [] : (await prisma.user.findMany({
      where: {
        role: 'student',
        OR: [
          { studentEnrollments: { some: { teacherId: actor.userId!, status: 'active' } } },
          { trackAssignments: { some: { assignedByUserId: actor.userId! } } },
        ],
      },
      select: { id: true },
    })).map((student) => student.id)

    await prisma.$transaction(async (tx) => {
      if (canEditStructure) {
        await tx.track.update({ where: { id: params.id }, data: { name, description: description || null } })
        await tx.trackWiki.deleteMany({ where: { trackId: params.id } })
        await tx.trackWiki.createMany({ data: effectiveWikis.map((wikiSlug, position) => ({ trackId: params.id, wikiSlug, position })) })
      }
      await tx.trackAssignment.deleteMany({
        where: {
          trackId: params.id,
          studentId: actor.isAdmin
            ? { notIn: studentIds }
            : { in: eligibleStudentIds, notIn: studentIds },
        },
      })
      if (studentIds.length) {
        await tx.trackAssignment.createMany({
          data: studentIds.map((studentId) => ({ trackId: params.id, studentId, assignedByUserId: actor.userId })),
          skipDuplicates: true,
        })
      }
    })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update track' }, { status: error instanceof AuthError ? error.status : 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { actor, track } = await findTrack(params.id)
    if (!actor.isAdmin && track.createdByUserId !== actor.id) throw new AuthError('Only the creator or an admin can delete this track', 403)
    await prisma.track.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete track' }, { status: error instanceof AuthError ? error.status : 500 })
  }
}
