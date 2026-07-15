import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertTrackScope, requireTrackActor } from '@/lib/track-auth'

export const dynamic = 'force-dynamic'

function strings(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))] : []
}

export async function GET() {
  try {
    const actor = await requireTrackActor()
    const [tracks, wikis, students] = await Promise.all([
      prisma.track.findMany({
        where: actor.isAdmin ? undefined : { createdByUserId: actor.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          wikis: { orderBy: { position: 'asc' } },
          assignments: { include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } }, orderBy: { assignedAt: 'desc' } },
        },
      }),
      prisma.wiki.findMany({
        where: { isPublished: true, ...(actor.isAdmin ? {} : { slug: { in: actor.wikiSlugs } }) },
        orderBy: { displayName: 'asc' },
        select: { slug: true, displayName: true, picture: true },
      }),
      actor.isAdmin
        ? prisma.user.findMany({ where: { role: 'student', disabledAt: null }, orderBy: [{ name: 'asc' }, { email: 'asc' }], select: { id: true, name: true, email: true, avatarUrl: true } })
        : prisma.user.findMany({
            where: { role: 'student', studentEnrollments: { some: { teacherId: actor.userId!, status: 'active' } }, disabledAt: null },
            orderBy: [{ name: 'asc' }, { email: 'asc' }],
            select: { id: true, name: true, email: true, avatarUrl: true },
          }),
    ])

    const wikiMap = new Map(wikis.map((wiki) => [wiki.slug, wiki]))
    const allWikiSlugs = [...new Set(tracks.flatMap((track) => track.wikis.map((wiki) => wiki.wikiSlug)))]
    const allStudentIds = [...new Set(tracks.flatMap((track) => track.assignments.map((assignment) => assignment.studentId)))]
    const [lessons, completed] = await Promise.all([
      allWikiSlugs.length ? prisma.lesson.findMany({ where: { wikiSlug: { in: allWikiSlugs }, status: 'published' }, select: { id: true, wikiSlug: true } }) : [],
      allStudentIds.length ? prisma.lessonProgress.findMany({ where: { studentId: { in: allStudentIds }, wikiSlug: { in: allWikiSlugs }, status: 'completed' }, select: { studentId: true, lessonId: true } }) : [],
    ])
    const completedByStudent = new Map<string, Set<string>>()
    for (const item of completed) {
      if (!completedByStudent.has(item.studentId)) completedByStudent.set(item.studentId, new Set())
      completedByStudent.get(item.studentId)!.add(item.lessonId)
    }

    const payload = tracks.map((track) => {
      const slugs = new Set(track.wikis.map((wiki) => wiki.wikiSlug))
      const lessonIds = lessons.filter((lesson) => slugs.has(lesson.wikiSlug)).map((lesson) => lesson.id)
      return {
        ...track,
        wikis: track.wikis.map((item) => ({ ...item, wiki: wikiMap.get(item.wikiSlug) ?? { slug: item.wikiSlug, displayName: item.wikiSlug, picture: null } })),
        assignments: track.assignments.map((assignment) => {
          const completedCount = lessonIds.filter((id) => completedByStudent.get(assignment.studentId)?.has(id)).length
          return { ...assignment, progress: { completed: completedCount, total: lessonIds.length, percent: lessonIds.length ? Math.round(completedCount / lessonIds.length * 100) : 0 } }
        }),
      }
    })

    return NextResponse.json({ tracks: payload, wikis, students, canManageAll: actor.isAdmin })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load tracks' }, { status: error instanceof AuthError ? error.status : 500 })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireTrackActor()
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const wikiSlugs = strings(body?.wikiSlugs)
    const studentIds = strings(body?.studentIds)
    if (!name) throw new AuthError('Track name is required', 400)
    if (!wikiSlugs.length) throw new AuthError('Select at least one wiki', 400)
    await assertTrackScope(actor, wikiSlugs, studentIds)

    const track = await prisma.track.create({
      data: {
        name,
        description: description || null,
        createdByUserId: actor.id,
        createdByType: actor.kind,
        createdByName: actor.name,
        createdByEmail: actor.email,
        wikis: { create: wikiSlugs.map((wikiSlug, position) => ({ wikiSlug, position })) },
        assignments: { create: studentIds.map((studentId) => ({ studentId, assignedByUserId: actor.userId })) },
      },
    })
    return NextResponse.json({ ok: true, track }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create track' }, { status: error instanceof AuthError ? error.status : 500 })
  }
}
