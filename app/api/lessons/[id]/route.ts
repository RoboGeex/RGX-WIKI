import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import { findDeveloperById } from '@/lib/developers'
import { canEditLesson, canDeleteLesson, canManageWiki } from '@/lib/assignments'

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

    const actorId = getActorIdFromRequest(req)
    const developer = actorId ? await findDeveloperById(actorId) : undefined
    const isEnforcementOn = process.env.ENFORCE_DEV_OWNERSHIP === 'true'

    if (isEnforcementOn && !canManageWiki(developer, lesson.wikiSlug)) {
      return NextResponse.json({ error: 'Access denied: You are not assigned to this wiki' }, { status: 403 })
    }

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
    const isAdmin = developer?.role === 'admin' || developer?.role === 'superadmin'

    // Fetch lesson to know wikiSlug and owner
    const prismaForLookup = getPrisma()
    const existing = await prismaForLookup.lesson.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      select: { ownerId: true, wikiSlug: true, status: true, publishedAt: true },
    })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!canEditLesson(developer, existing.wikiSlug, existing.ownerId)) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this lesson' }, { status: 403 })
    }

    const prisma = getPrisma(existing.wikiSlug)

    const shouldEnforceOwnership = process.env.ENFORCE_DEV_OWNERSHIP === 'true'

    const updateData = {
      ...payload,
      // Only restrict to draft if ownership enforcement is enabled AND user is not admin
      status: (shouldEnforceOwnership && !isAdmin) ? 'draft' : (payload.status || existing.status || 'draft'),
      publishedAt:
        (!shouldEnforceOwnership || isAdmin) && payload.status === 'published'
          ? payload.publishedAt || existing.publishedAt || new Date().toISOString()
          : existing.publishedAt || null,
      lastModifiedBy: developer?.id || payload.lastModifiedBy,
    }

    const saved = await prisma.lesson.update({ where: { id }, data: updateData })
    return NextResponse.json({ ok: true, lesson: saved })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update lesson' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const actorId = getActorIdFromRequest(req)
    const developer = actorId ? await findDeveloperById(actorId) : undefined

    if (!canDeleteLesson(developer)) {
      return NextResponse.json({ error: 'Only Super Admins can delete lessons' }, { status: 403 })
    }

    // Get wikiSlug from query params so we use the correct database
    const { searchParams } = new URL(req.url)
    const wikiSlug = searchParams.get('wiki') || searchParams.get('kit') || undefined

    // Use the wiki-specific prisma client for both lookup and delete
    const prisma = getPrisma(wikiSlug)
    const existing = await prisma.lesson.findFirst({
      where: {
        ...(wikiSlug ? { wikiSlug } : {}),
        OR: [{ id }, { slug: id }],
      },
      select: { id: true, slug: true, wikiSlug: true, title_en: true },
    })
    if (!existing) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

    // Delete from the same prisma instance that found it
    if (existing.slug === 'getting-started') {
      return NextResponse.json({ error: 'The "Getting Started" lesson cannot be deleted as it is a required system lesson.' }, { status: 400 })
    }

    await prisma.lesson.delete({ where: { id: existing.id } })

    return NextResponse.json({ ok: true, deleted: existing.id, title: existing.title_en })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete lesson' }, { status: 500 })
  }
}
