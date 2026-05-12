import { NextResponse } from 'next/server'
import { getKits } from '@/lib/data'
import { loadLessonsForKit } from '@/lib/lesson-loader'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/wikis/[slug]/lesson-count
 *
 * Returns the total visible lesson count for a single wiki.  Used by the editor
 * dashboard to load counts client-side, per tile, so one slow wiki DB never
 * holds up the rest of the page.
 *
 * Always returns 200 with `{ count: <number> }` — failures degrade to `0`
 * (with `error` populated for debugging) instead of blocking the tile.
 */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const slug = (params.slug || '').trim()
  if (!slug) {
    return NextResponse.json({ count: 0, error: 'Wiki slug required' })
  }

  try {
    const kits = getKits(slug)
    const kitSlugs = kits.length ? kits.map((k) => k.slug) : [slug]

    const counts = await Promise.all(
      kitSlugs.map((kitSlug) =>
        loadLessonsForKit(kitSlug, slug)
          .then((lessons) => lessons.length)
          .catch(() => 0),
      ),
    )

    return NextResponse.json({ count: counts.reduce((s, n) => s + n, 0) })
  } catch (e: any) {
    return NextResponse.json({ count: 0, error: e?.message || 'Failed to load count' })
  }
}
