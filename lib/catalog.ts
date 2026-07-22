import { getKits, getWikis } from '@/lib/data'
import { getWikisFromDb } from '@/lib/server-data'
import type { Wiki } from '@/lib/types'

/**
 * The public wiki catalog (/wikis).
 *
 * This is the single adapter between the app's real data and the catalog UI.
 * It deliberately uses ONLY columns that already exist — `Wiki.tags` supplies
 * the category facet and `Wiki.grade` the level facet — so the catalog needs
 * no schema change. Descriptions come from the matching Kit's bilingual
 * overview text, falling back to a generated sentence.
 */
export type CatalogEntry = {
  slug: string
  displayName: string
  description_en: string
  description_ar: string
  /** Human label for the level facet, e.g. "All Levels". */
  gradeLabel: string
  /** Category facet values — straight from Wiki.tags. */
  tags: string[]
  coverImage: string
  /** Where the card links to: a custom domain if the wiki has one, else in-app. */
  href: string
  /** Pre-lowercased haystack for the search box. */
  searchable: string
}

const CARD_ART_TONES = [
  ['#f4715d', '#d44537'],
  ['#f05d4e', '#a8362c'],
  ['#f89486', '#f05d4e'],
  ['#d44537', '#7b2820'],
]

function isPublicDomain(domain: string) {
  const normalized = domain.replace(/https?:\/\//i, '').replace(/\/$/, '').trim().toLowerCase()
  if (!normalized) return false
  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') return false
  if (normalized.endsWith('.localhost')) return false
  return true
}

/** Mirrors the previous /wikis behaviour: dedicated domain wins, else in-app route. */
export function getWikiHref(domains: string[] | undefined, locale: string | undefined, slug: string) {
  const primaryDomain = (domains || []).find(isPublicDomain)
  const normalizedDomain = primaryDomain?.replace(/https?:\/\//i, '').replace(/\/$/, '').trim()
  if (normalizedDomain) return `https://${normalizedDomain}`
  return `/${locale || 'en'}/${slug}`
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Inline SVG cover so a wiki with no picture still gets a branded card. */
export function buildGeneratedCover(displayName: string, slug: string) {
  const [from, to] = CARD_ART_TONES[slug.length % CARD_ART_TONES.length]
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const title = displayName.slice(0, 28).toUpperCase()

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}" />
      <stop offset="100%" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)" />
  <circle cx="950" cy="170" r="250" fill="rgba(255,255,255,0.16)" />
  <circle cx="170" cy="710" r="310" fill="rgba(255,255,255,0.12)" />
  <text x="80" y="185" font-size="220" font-family="Verdana, sans-serif" font-weight="700" fill="rgba(255,255,255,0.78)">${escapeSvg(initials || 'RG')}</text>
  <text x="80" y="725" font-size="64" font-family="Verdana, sans-serif" font-weight="700" fill="rgba(255,255,255,0.9)">${escapeSvg(title || 'ROBOGEEX WIKI')}</text>
</svg>`.trim()

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function resolveCoverImage(image: string | undefined, displayName: string, slug: string) {
  const normalized = (image || '').trim()
  // The generic logo is a placeholder, not a real cover — generate instead.
  if (normalized && normalized !== '/images/robogeex-logo.png') return normalized
  return buildGeneratedCover(displayName, slug)
}

/**
 * Merge the static wiki list with the DB (DB wins per slug), join each to its
 * Kit for descriptions/hero art, and project into the catalog model.
 * Never throws: a DB outage degrades to the file-based list.
 */
export async function getCatalogEntries(): Promise<CatalogEntry[]> {
  const fileWikis = getWikis()

  let dbWikis: Wiki[] = []
  try {
    dbWikis = await getWikisFromDb()
  } catch (e) {
    console.warn('[catalog] getWikisFromDb failed — falling back to file wikis:', e instanceof Error ? e.message : e)
  }

  const bySlug = new Map<string, Wiki>(fileWikis.map((w) => [w.slug, w]))
  dbWikis.forEach((w) => bySlug.set(w.slug, { ...(bySlug.get(w.slug) || ({} as Wiki)), ...w }))

  const kitsByWikiSlug = new Map(getKits().map((kit) => [kit.wikiSlug, kit]))

  return Array.from(bySlug.values())
    .filter((wiki) => wiki.isPublished !== false)
    .map((wiki) => {
      const displayName = wiki.displayName || wiki.slug
      const kit = kitsByWikiSlug.get(wiki.slug)

      const description_en =
        (kit?.overview_en || '').trim() ||
        `Learning content and practical projects for ${displayName}.`
      const description_ar = (kit?.overview_ar || '').trim() || description_en

      const gradeLabel = (wiki.grade || 'All Levels').trim() || 'All Levels'
      const tags = (wiki.tags || []).map((t) => String(t).trim()).filter(Boolean)

      return {
        slug: wiki.slug,
        displayName,
        description_en,
        description_ar,
        gradeLabel,
        tags,
        coverImage: resolveCoverImage(wiki.picture || kit?.heroImage, displayName, wiki.slug),
        href: getWikiHref(wiki.domains, wiki.defaultLocale, wiki.slug),
        searchable: [displayName, wiki.slug, description_en, description_ar, gradeLabel, ...tags]
          .join(' ')
          .toLowerCase(),
      }
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}
