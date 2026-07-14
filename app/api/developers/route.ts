import { NextResponse } from 'next/server'
import { findDeveloperById } from '@/lib/developers'
import { getDevelopersPrisma } from '@/lib/prisma-developers'
import { resolveDeveloperId } from '@/lib/dev-session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getActorId(req: Request): string | undefined {
  return resolveDeveloperId(req)
}

function parseWikiSlugs(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((v) => typeof v === 'string')
  if (typeof raw === 'string') return raw.split(',').map((v) => v.trim()).filter(Boolean)
  return []
}

export async function GET(request: Request) {
  try {
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
      rows.map((row) => ({
        id: String(row.id),
        name: row.name || undefined,
        email: row.email,
        role: row.role || undefined,
        wikiSlugs: parseWikiSlugs(row.wikiSlugs),
      })),
    )
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to list developers' }, { status: 500 })
  }
}
