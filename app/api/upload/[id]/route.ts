import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import { getWikiByDomain, getWikis } from '@/lib/data'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function sanitizeSlug(value?: string | null) {
  if (!value) return undefined
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  if (!cleaned || cleaned === 'default' || cleaned === 'global') return undefined
  return cleaned
}

function buildSlugCandidates(req: Request) {
  const host = req.headers.get('host')
  const hostWiki = host ? getWikiByDomain(host)?.slug : undefined
  const url = new URL(req.url)
  const slugFromQuery = sanitizeSlug(url.searchParams.get('wiki'))
  const slugFromHeader = sanitizeSlug(req.headers.get('x-wiki-slug'))
  const slugFromHost = sanitizeSlug(hostWiki)

  const seen = new Set<string>()
  const ordered: (string | undefined)[] = []
  const push = (slug?: string) => {
    const normalized = sanitizeSlug(slug) || undefined
    const key = normalized ?? '__default__'
    if (seen.has(key)) return
    seen.add(key)
    ordered.push(normalized)
  }

  push(slugFromQuery)
  push(slugFromHeader)
  push(slugFromHost)

  if (ordered.length === 0) {
    for (const wiki of getWikis()) {
      push(wiki.slug)
    }
  }

  push(undefined)
  return ordered
}

async function findAsset(id: number, slugs: (string | undefined)[]) {
  for (const slug of slugs) {
    try {
      const prisma = getPrisma(slug)
      const asset = await prisma.asset.findUnique({ where: { id } })
      if (asset?.data) {
        return asset
      }
    } catch (error) {
      console.error(`Asset lookup failed for wiki "${slug ?? 'default'}":`, error)
    }
  }
  return null
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const assetId = Number(params.id)
    if (Number.isNaN(assetId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const candidates = buildSlugCandidates(req)
    const asset = await findAsset(assetId, candidates)
    if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = asset.data as Buffer
    return new NextResponse(body as any, {
      headers: {
        'Content-Type': asset.mimeType || 'application/octet-stream',
        'Content-Length': String(asset.size ?? body.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}

