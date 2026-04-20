import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import { getWikiByDomain, getWikis } from '@/lib/data'
import { isGcsAssetReadEnabled, readAssetFromGcs } from '@/lib/gcs-assets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function sanitizeSlug(value?: string | null) {
  if (!value) return undefined
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
  if (!cleaned || cleaned === 'default' || cleaned === 'global') return undefined
  return cleaned
}

function getKnownWikiSlugs(): Set<string> {
  return new Set(
    getWikis()
      .map((wiki) => sanitizeSlug(wiki.slug))
      .filter((slug): slug is string => Boolean(slug)),
  )
}

// Older lesson content still contains /api/upload/{id} without a wiki query string.
// Recover the wiki from the parent page URL so we do not fan out across every DB.
function inferWikiSlugFromUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl) return undefined

  try {
    const url = new URL(rawUrl)
    const knownWikiSlugs = getKnownWikiSlugs()
    const explicitWiki =
      sanitizeSlug(url.searchParams.get('wiki')) ||
      sanitizeSlug(url.searchParams.get('wikiSlug')) ||
      sanitizeSlug(url.searchParams.get('slug'))

    if (explicitWiki) {
      return explicitWiki
    }

    const hostWiki = sanitizeSlug(getWikiByDomain(url.host)?.slug)
    if (hostWiki) {
      return hostWiki
    }

    const pathSegments = url.pathname
      .split('/')
      .map((segment) => sanitizeSlug(segment))
      .filter((segment): segment is string => Boolean(segment))

    return pathSegments.find((segment) => knownWikiSlugs.has(segment))
  } catch {
    return undefined
  }
}

function buildSlugCandidates(req: Request) {
  const host = req.headers.get('host')
  const hostWiki = host ? getWikiByDomain(host)?.slug : undefined
  const url = new URL(req.url)
  const slugFromQuery = sanitizeSlug(url.searchParams.get('wiki'))
  const slugFromHeader = sanitizeSlug(req.headers.get('x-wiki-slug'))
  const slugFromReferer = inferWikiSlugFromUrl(req.headers.get('referer'))
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

  const pushDefined = (slug?: string) => {
    if (!slug) return
    push(slug)
  }

  pushDefined(slugFromQuery)
  pushDefined(slugFromHeader)
  pushDefined(slugFromReferer)
  pushDefined(slugFromHost)

  if (ordered.length === 0) {
    for (const wiki of getWikis()) {
      pushDefined(wiki.slug)
    }
  }

  push(undefined)
  return ordered
}

async function findAssetCandidates(id: number, slugs: (string | undefined)[]) {
  const matches: { slug?: string; asset: any }[] = []
  for (const slug of slugs) {
    try {
      const prisma = getPrisma(slug)
      const asset = await prisma.asset.findUnique({ where: { id } })
      if (asset) {
        matches.push({ slug, asset })
      }
    } catch (error) {
      console.error(`Asset lookup failed for wiki "${slug ?? 'default'}":`, error)
    }
  }
  return matches
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const assetId = Number(params.id)
    if (Number.isNaN(assetId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    const candidates = buildSlugCandidates(req)
    const matches = await findAssetCandidates(assetId, candidates)
    if (matches.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    for (const match of matches) {
      const { slug, asset } = match
      const mimeType = asset.mimeType || 'application/octet-stream'

      if (isGcsAssetReadEnabled()) {
        const gcsBody = await readAssetFromGcs({
          wikiSlug: slug,
          assetId,
          filename: asset.filename,
        })
        if (gcsBody) {
          return new NextResponse(gcsBody as any, {
            headers: {
              'Content-Type': mimeType,
              'Content-Length': String(gcsBody.length),
              'Cache-Control': 'public, max-age=31536000, immutable',
              'X-Asset-Source': 'gcs',
            },
          })
        }
      }

      const dbBody = asset.data as Buffer | null
      if (dbBody && dbBody.length > 0) {
        return new NextResponse(dbBody as any, {
          headers: {
            'Content-Type': mimeType,
            'Content-Length': String(asset.size ?? dbBody.length),
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Asset-Source': 'db',
          },
        })
      }
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}

