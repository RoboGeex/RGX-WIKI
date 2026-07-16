import { NextResponse } from 'next/server'
import { AuthError, requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const STUDENT_CAP = 35

export async function GET(_request: Request, { params }: { params: { token: string } }) {
  try {
    const link = await prisma.trackInviteLink.findUnique({
      where: { token: params.token },
      include: {
        track: { include: { wikis: { orderBy: { position: 'asc' } } } },
        _count: { select: { assignments: true } },
      },
    })
    if (!link) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
    const activeCount = await prisma.trackAssignment.count({
      where: {
        trackId: link.trackId,
        ...(link.createdByUserId
          ? { assignedByUserId: link.createdByUserId }
          : { link: { createdByActorId: link.createdByActorId } }),
      },
    })
    const wikis = link.track.wikis.length ? await prisma.wiki.findMany({
      where: { slug: { in: link.track.wikis.map((wiki) => wiki.wikiSlug) } },
      select: { slug: true, displayName: true },
    }) : []
    const names = new Map(wikis.map((wiki) => [wiki.slug, wiki.displayName]))
    return NextResponse.json({
      track: {
        id: link.track.id,
        name: link.track.name,
        description: link.track.description,
        wikis: link.track.wikis.map((wiki) => ({ slug: wiki.wikiSlug, displayName: names.get(wiki.wikiSlug) || wiki.wikiSlug })),
      },
      inviter: { name: link.createdByName, email: link.createdByEmail },
      isActive: link.isActive,
      spotsLeft: Math.max(0, STUDENT_CAP - activeCount),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(_request: Request, { params }: { params: { token: string } }) {
  try {
    const user = await requireUser()
    if (user.role !== 'student') return NextResponse.json({ error: 'Only student accounts can join via a link' }, { status: 403 })
    const link = await prisma.trackInviteLink.findUnique({
      where: { token: params.token },
      include: { _count: { select: { assignments: true } } },
    })
    if (!link) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
    if (!link.isActive) return NextResponse.json({ error: 'This link has been closed' }, { status: 403 })

    const existing = await prisma.trackAssignment.findUnique({
      where: { trackId_studentId: { trackId: link.trackId, studentId: user.id } },
    })
    if (existing) return NextResponse.json({ ok: true, trackId: link.trackId, alreadyAssigned: true })
    const activeCount = await prisma.trackAssignment.count({
      where: {
        trackId: link.trackId,
        ...(link.createdByUserId
          ? { assignedByUserId: link.createdByUserId }
          : { link: { createdByActorId: link.createdByActorId } }),
      },
    })
    if (activeCount >= STUDENT_CAP) return NextResponse.json({ error: 'This track is full (35 students maximum)' }, { status: 403 })

    await prisma.trackAssignment.create({
      data: {
        trackId: link.trackId,
        studentId: user.id,
        assignedByUserId: link.createdByUserId,
        linkId: link.id,
      },
    })
    return NextResponse.json({ ok: true, trackId: link.trackId })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: error instanceof AuthError ? error.status : 500 })
  }
}
