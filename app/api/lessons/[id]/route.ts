import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import { findDeveloperById } from '@/lib/developers'
import { canManageLesson } from '@/lib/assignments'

function getActorIdFromRequest(req: Request): string | undefined {
  const headers = (req as any)?.headers as Headers | undefined
  if (!headers) return undefined
  const raw =
    headers.get('x-user-id') ||
    headers.get('x-actor-id') ||
    headers.get('x-developer-id') ||
    headers.get('x-dev-id')
  return raw ? raw.trim() || undefined : undefined
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { searchParams } = new URL(req.url)
    const wikiSlug = searchParams.get('kit') || searchParams.get('wiki') || undefined
    const prisma = getPrisma(wikiSlug)
    const lesson = await prisma.lesson.findFirst({
      where: {
        ...(wikiSlug ? { wikiSlug } : {}),
        OR: [{ id }, { slug: id }],
      },
    })
    if (!lesson) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(lesson)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load lesson' }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const payload = await req.json()
    const actorId = getActorIdFromRequest(req)
    const developer = actorId ? await findDeveloperById(actorId) : undefined
    const isAdmin = developer?.role === 'admin'

    // Fetch lesson to know wikiSlug and owner
    const prismaForLookup = getPrisma()
    const existing = await prismaForLookup.lesson.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      select: { ownerId: true, wikiSlug: true, status: true, publishedAt: true },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!isAdmin && (!existing.ownerId || existing.ownerId !== developer?.id)) {
      return NextResponse.json({ error: 'Only owner or admin can edit this lesson' }, { status: 403 })
    }

    const prisma = getPrisma(existing.wikiSlug)

    const updateData = {
      ...payload,
      status: isAdmin ? payload.status || existing.status || 'draft' : 'draft',
      publishedAt:
        isAdmin && payload.status === 'published'
          ? payload.publishedAt || existing.publishedAt || new Date().toISOString()
          : null,
      lastModifiedBy: developer?.id || payload.lastModifiedBy,
    }

    const saved = await prisma.lesson.update({ where: { id }, data: updateData })
    return NextResponse.json({ ok: true, lesson: saved })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update lesson' }, { status: 500 })
  }
}
