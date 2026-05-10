import { NextResponse } from 'next/server'
import { findDeveloperById } from '@/lib/developers'
import { getDevelopersPrisma } from '@/lib/prisma-developers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getActorId(req: Request): string | undefined {
  const headers = (req as any)?.headers as Headers | undefined
  if (!headers) return undefined
  const raw =
    headers.get('x-user-id') ||
    headers.get('x-actor-id') ||
    headers.get('x-developer-id') ||
    headers.get('x-dev-id')
  return raw ? raw.trim() || undefined : undefined
}

function parseWikiSlugs(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'string')
  if (typeof raw === 'string') return raw.split(',').map((v) => v.trim()).filter(Boolean)
  return []
}

// PUT /api/wikis/[slug]/members
// Body: { assignedIds: string[] }  — complete list of developer IDs that should have access to this wiki
export async function PUT(
  request: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const wikiSlug = (params.slug || '').trim()
    if (!wikiSlug) return NextResponse.json({ error: 'Missing wiki slug' }, { status: 400 })

    const actorId = getActorId(request)
    if (!actorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const actor = await findDeveloperById(actorId)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const assignedIds: string[] = Array.isArray(body?.assignedIds)
      ? body.assignedIds.map(String)
      : []

    const prisma = getDevelopersPrisma()
    const allDevelopers = await prisma.developer.findMany({
      select: { id: true, role: true, wikiSlugs: true },
    })

    // Update each developer's wikiSlugs as needed
    const updates = allDevelopers
      .filter((dev) => (dev.role || '') !== 'superadmin') // superadmins have implicit access
      .map(async (dev) => {
        const currentSlugs = parseWikiSlugs(dev.wikiSlugs)
        const shouldHaveAccess = assignedIds.includes(String(dev.id))
        const hasAccess = currentSlugs.includes(wikiSlug)

        if (shouldHaveAccess === hasAccess) return // no change needed

        const newSlugs = shouldHaveAccess
          ? [...currentSlugs, wikiSlug]
          : currentSlugs.filter((s) => s !== wikiSlug)

        await prisma.developer.update({
          where: { id: dev.id },
          data: { wikiSlugs: newSlugs },
        })
      })

    await Promise.all(updates)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update members' }, { status: 500 })
  }
}

// GET /api/wikis/[slug]/members — returns developers assigned to this wiki
export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const wikiSlug = (params.slug || '').trim()
    if (!wikiSlug) return NextResponse.json({ error: 'Missing wiki slug' }, { status: 400 })

    const actorId = getActorId(request)
    if (!actorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const actor = await findDeveloperById(actorId)
    if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const prisma = getDevelopersPrisma()
    const rows = await prisma.developer.findMany({
      select: { id: true, name: true, email: true, role: true, wikiSlugs: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(
      rows
        .filter((dev) => parseWikiSlugs(dev.wikiSlugs).includes(wikiSlug))
        .map((dev) => ({
          id: String(dev.id),
          name: dev.name || undefined,
          email: dev.email,
          role: dev.role || undefined,
        })),
    )
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to get members' }, { status: 500 })
  }
}
