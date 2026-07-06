import { getKits, getWikis } from '@/lib/data'
import { getWikisFromDb } from '@/lib/server-data'
import Link from 'next/link'
import { ArrowRight, Bell, Cpu, Hand, Play, Search, Sparkles } from 'lucide-react'
import { Lexend, Manrope } from 'next/font/google'
import type { CSSProperties } from 'react'

export const dynamic = 'force-dynamic'

const displayFont = Lexend({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
})

const bodyFont = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const PALETTE = {
  primary: '#E84433',
  primaryDim: '#C93527',
  secondary: '#F06A5D',
  accent: '#A82E22',
  bg: '#FAF8F7',
  surface: '#FFFFFF',
  textPrimary: '#1A1110',
  textSecondary: '#6D4B47',
  border: '#F1D6D2',
  tertiary: '#F8B7AF',
  neutral: '#FAF8F7',
  onSurface: '#1A1110',
  deepSurface: '#2A1512',
  primaryRgb: '232, 68, 51',
  secondaryRgb: '240, 106, 93',
}

const WIKI_THEME_VARS = {
  '--primary': PALETTE.primary,
  '--secondary': PALETTE.secondary,
  '--accent': PALETTE.accent,
  '--bg': PALETTE.bg,
  '--surface': PALETTE.surface,
  '--text-primary': PALETTE.textPrimary,
  '--text-secondary': PALETTE.textSecondary,
  '--border': PALETTE.border,
  '--primary-rgb': PALETTE.primaryRgb,
  '--secondary-rgb': PALETTE.secondaryRgb,
} as CSSProperties

type WikisPageProps = {
  searchParams?: {
    q?: string
  }
}

type WikiCardModel = {
  slug: string
  displayName: string
  description: string
  gradeLabel: string
  href: string
  coverImage: string
  searchable: string
}

const CARD_ART_TONES = [
  ['#E84433', '#F06A5D'],
  ['#F06A5D', '#C93527'],
  ['#D33A2B', '#E84433'],
  ['#C93527', '#A82E22'],
]

function getWikiHref(domains: string[] | undefined, locale: string | undefined, slug: string) {
  const isPublicDomain = (domain: string) => {
    const normalized = domain
      .replace(/https?:\/\//i, '')
      .replace(/\/$/, '')
      .trim()
      .toLowerCase()
    if (!normalized) return false
    if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1') return false
    if (normalized.endsWith('.localhost')) return false
    return true
  }

  const primaryDomain = (domains || []).find(isPublicDomain)
  const normalizedDomain = primaryDomain
    ?.replace(/https?:\/\//i, '')
    .replace(/\/$/, '')
    .trim()

  if (normalizedDomain) {
    return `https://${normalizedDomain}`
  }

  return `/${locale || 'en'}/${slug}`
}

function buildChipLabels(displayName: string) {
  const words = displayName
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length >= 4) {
    return [`${words[0]} ${words[1]}`, `${words[2]} ${words[3]}`]
  }

  if (words.length >= 2) {
    return [words[0], words[1]]
  }

  if (words.length === 1) {
    return [words[0], 'WIKI']
  }

  return ['LEARNING', 'TRACK']
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildGeneratedCover(displayName: string, slug: string) {
  const tones = CARD_ART_TONES[slug.length % CARD_ART_TONES.length]
  const [from, to] = tones
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
  if (normalized && normalized !== '/images/robogeex-logo.png') {
    return normalized
  }
  return buildGeneratedCover(displayName, slug)
}

function fallbackCard(query: string): WikiCardModel {
  const title = query ? `No results for "${query}"` : 'Discover Learning Wikis'
  return {
    slug: 'explore',
    displayName: title,
    description: query
      ? 'Try a different keyword to see matching wiki tracks.'
      : 'Your next robotics learning path is one click away.',
    gradeLabel: 'ALL LEVELS',
    href: '/wikis',
    coverImage: buildGeneratedCover(title, 'explore'),
    searchable: '',
  }
}

export default async function WikisLandingPage({ searchParams }: WikisPageProps) {
  const fileWikis = getWikis()
  const dbWikis = await getWikisFromDb()

  const allWikis =
    dbWikis.length > 0
      ? (() => {
          const bySlug = new Map(fileWikis.map((wiki) => [wiki.slug, wiki]))
          dbWikis.forEach((wiki) => {
            bySlug.set(wiki.slug, { ...(bySlug.get(wiki.slug) || {}), ...wiki })
          })
          return Array.from(bySlug.values())
        })()
      : fileWikis

  const kits = getKits()
  const kitsByWikiSlug = new Map(kits.map((kit) => [kit.wikiSlug, kit]))

  const publishedWikis = allWikis.filter((wiki) => wiki.isPublished !== false)
  const rawQuery = (searchParams?.q || '').trim()
  const query = rawQuery.toLowerCase()

  const wikiCards: WikiCardModel[] = publishedWikis
    .map((wiki) => {
      const displayName = wiki.displayName || wiki.slug
      const kit = kitsByWikiSlug.get(wiki.slug)
      const description =
        kit?.overview_en || `Learning content and practical projects for ${displayName}.`
      const gradeLabel = (wiki.grade || 'All Levels').toUpperCase()
      const searchable = [displayName, wiki.slug, description, gradeLabel].join(' ').toLowerCase()

      return {
        slug: wiki.slug,
        displayName,
        description,
        gradeLabel,
        href: getWikiHref(wiki.domains, wiki.defaultLocale, wiki.slug),
        coverImage: resolveCoverImage(wiki.picture || kit?.heroImage, displayName, wiki.slug),
        searchable,
      }
    })
    .filter((card) => !query || card.searchable.includes(query))

  const defaultCard = fallbackCard(rawQuery)
  const [featured, clickyCard, smartCard, videoCard] = [
    wikiCards[0] || defaultCard,
    wikiCards[1] || wikiCards[0] || defaultCard,
    wikiCards[2] || wikiCards[1] || wikiCards[0] || defaultCard,
    wikiCards[3] || wikiCards[2] || wikiCards[1] || wikiCards[0] || defaultCard,
  ]

  const extraCards = wikiCards.slice(4)
  const videoTags = buildChipLabels(videoCard.displayName)

  return (
    <div
      className={`${bodyFont.className} min-h-screen`}
      style={{
        ...WIKI_THEME_VARS,
        color: 'var(--text-primary)',
        background:
          'radial-gradient(circle at 15% 12%, rgba(var(--primary-rgb), 0.16), transparent 42%), radial-gradient(circle at 84% 8%, rgba(var(--secondary-rgb), 0.18), transparent 38%), linear-gradient(180deg, #FAEFED 0%, var(--bg) 38%, #FBEAE8 100%)',
      }}
    >
      <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-10">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between rounded-[1.3rem] bg-white/70 px-4 py-3 shadow-[0_24px_60px_-44px_rgba(43,42,81,0.6)] backdrop-blur-3xl sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <img src="/images/robogeex-logo.png" alt="RoboGeex" className="h-9 w-9 rounded-xl" />
              <span className={`${displayFont.className} text-lg font-bold tracking-tight text-[var(--text-primary)]`}>
                RoboGeex
              </span>
            </Link>

            <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--text-secondary)] lg:flex">
              <Link href="/" className="transition-colors hover:text-[var(--text-primary)]">
                Home
              </Link>
              <Link href="/wikis" className="text-[var(--primary)]">
                Wikis
              </Link>
              <Link href="/editor/dashboard" className="transition-colors hover:text-[var(--text-primary)]">
                Mentors
              </Link>
              <Link href="/dashboard" className="transition-colors hover:text-[var(--text-primary)]">
                Pricing
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden h-11 min-w-[220px] items-center gap-2 rounded-full bg-[#F8EFED] px-4 text-[#9E726B] shadow-[inset_0_1px_2px_rgba(73,24,19,0.08)] md:flex">
              <Search size={16} />
              <input
                type="search"
                aria-label="Find a wiki"
                placeholder="Find a wiki..."
                className="w-full bg-transparent text-sm font-medium text-[var(--text-secondary)] placeholder:text-[#B58A83] focus:outline-none"
              />
            </div>
            <Link
              href="/signup"
              className="inline-flex h-11 items-center rounded-full px-6 text-sm font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                boxShadow: '0 18px 32px -20px rgba(var(--primary-rgb), 0.72)',
              }}
            >
              Sign Up
            </Link>
            <button
              type="button"
              aria-label="Notifications"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F8EFED] text-[var(--text-secondary)] transition-transform hover:-translate-y-0.5"
            >
              <Bell size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="pb-16 pt-6 sm:pt-8 lg:pb-20">
        <section className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-10">
          <div
            className="relative overflow-hidden rounded-[2.2rem] px-6 pb-16 pt-16 text-center shadow-[0_34px_80px_-56px_rgba(43,42,81,0.65)] sm:px-10 sm:pt-20 lg:pb-20"
            style={{
              background:
                'linear-gradient(135deg, rgba(var(--primary-rgb), 0.14) 0%, rgba(255, 255, 255, 0.74) 38%, rgba(var(--secondary-rgb), 0.16) 100%)',
            }}
          >
            <div
              className="absolute -left-14 -top-16 h-44 w-44 rounded-full blur-3xl"
              style={{ backgroundColor: 'var(--primary)', opacity: 0.2 }}
            />
            <div
              className="absolute -right-16 top-8 h-40 w-40 rounded-full blur-3xl"
              style={{ backgroundColor: PALETTE.secondary, opacity: 0.22 }}
            />
            <div
              className="absolute bottom-8 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full blur-3xl"
              style={{ backgroundColor: PALETTE.tertiary, opacity: 0.25 }}
            />

            <div className="relative mx-auto max-w-4xl">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/66 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
                <Sparkles size={14} />
                Curated Learning Hub
              </p>
              <h1 className={`${displayFont.className} text-4xl font-extrabold leading-[1.05] text-[var(--text-primary)] sm:text-5xl lg:text-[4.2rem]`}>
                RoboGeex Learning Wikis
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-[var(--text-secondary)] sm:text-xl">
                Explore the frontier of robotics and creative engineering through our curated
                collection of interactive wikis.
              </p>

              <form
                action="/wikis"
                method="get"
                className="mx-auto mt-10 flex max-w-[700px] flex-col gap-3 rounded-[1.25rem] bg-white/90 p-3 shadow-[0_20px_48px_-34px_rgba(43,42,81,0.6)] sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 items-center gap-3 px-2">
                  <Search size={18} className="text-[#7D82A1]" />
                  <input
                    id="wikis-search"
                    name="q"
                    defaultValue={rawQuery}
                    placeholder="What would you like to build today?"
                    className="h-11 w-full bg-transparent text-sm font-semibold text-[var(--text-primary)] placeholder:font-medium placeholder:text-[#B99089] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-[0.85rem] px-8 text-sm font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  }}
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-14 w-full max-w-[1240px] px-4 sm:px-6 lg:mt-16 lg:px-10">
          <div className="mb-7 flex items-end justify-between gap-4">
            <h2 className={`${displayFont.className} text-3xl font-extrabold text-[var(--text-primary)] sm:text-4xl`}>
              {rawQuery ? `Results for "${rawQuery}"` : 'All Wikis'}
            </h2>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--text-secondary)]">
              Curated Collection
            </p>
          </div>

          {wikiCards.length === 0 ? (
            <div className="rounded-[1.8rem] bg-white/75 px-6 py-14 text-center shadow-[0_22px_48px_-34px_rgba(43,42,81,0.5)] sm:px-10">
              <p className={`${displayFont.className} text-2xl font-bold text-[var(--text-primary)]`}>
                No wikis matched your search.
              </p>
              <p className="mx-auto mt-3 max-w-lg text-base font-medium text-[var(--text-secondary)]">
                Try another keyword, or clear your search to browse the full wiki collection.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-3">
                <Link
                  href={featured.href}
                  className="group relative overflow-hidden rounded-[2rem] bg-[#86ADC4] p-8 shadow-[0_24px_56px_-32px_rgba(43,42,81,0.55)] transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(var(--primary-rgb), 0.35) 0%, rgba(var(--secondary-rgb), 0.22) 100%)',
                  }}
                >
                  <img
                    src={featured.coverImage || '/images/robogeex-logo.png'}
                    alt={`${featured.displayName} cover`}
                    className="absolute inset-0 h-full w-full object-cover opacity-25 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(18,22,41,0.42)_0%,rgba(18,22,41,0.2)_50%,rgba(18,22,41,0.1)_100%)]" />

                  <div className="relative flex min-h-[260px] flex-col justify-end">
                    <span className="mb-4 inline-flex w-fit rounded-full bg-white/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.17em] text-white">
                      Primary Module
                    </span>
                    <h3 className={`${displayFont.className} max-w-[520px] text-3xl font-bold leading-tight text-white sm:text-[2.2rem]`}>
                      {featured.displayName}
                    </h3>
                    <p className="mt-4 max-w-[500px] text-sm font-medium leading-relaxed text-white/90 sm:text-base">
                      {featured.description}
                    </p>
                    <span
                      className="mt-8 inline-flex w-fit items-center gap-2 rounded-[0.9rem] px-5 py-3 text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
                    >
                      Explore Wiki
                      <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>

                <Link
                  href={clickyCard.href}
                  className="group rounded-[2rem] bg-[#FBE7E4] p-8 shadow-[0_24px_56px_-34px_rgba(43,42,81,0.45)] transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background:
                      'linear-gradient(150deg, rgba(var(--primary-rgb), 0.22) 0%, rgba(255, 255, 255, 0.7) 100%)',
                  }}
                >
                  <div className="relative mb-6 overflow-hidden rounded-[1.25rem]">
                    <img
                      src={clickyCard.coverImage}
                      alt={`${clickyCard.displayName} image`}
                      className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(18,22,41,0.38)_0%,rgba(18,22,41,0.15)_100%)]" />
                    <span className="absolute left-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/65 text-[var(--primary)]">
                      <Hand size={20} />
                    </span>
                  </div>
                  <h3 className={`${displayFont.className} text-[2rem] font-bold leading-tight text-[var(--text-primary)]`}>
                    {clickyCard.displayName}
                  </h3>
                  <p className="mt-4 text-sm font-medium leading-relaxed text-[var(--text-secondary)]">
                    {clickyCard.description}
                  </p>
                  <span className="mt-10 inline-flex h-11 w-full items-center justify-center rounded-[0.8rem] bg-white/85 text-sm font-bold text-[var(--text-primary)] shadow-[0_10px_20px_-14px_rgba(43,42,81,0.42)] transition-transform duration-300 group-hover:-translate-y-0.5">
                    View Details
                  </span>
                </Link>

                <Link
                  href={smartCard.href}
                  className="group rounded-[2rem] bg-[#FCEBE8] p-8 shadow-[0_22px_48px_-32px_rgba(43,42,81,0.42)] transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background:
                      'linear-gradient(145deg, rgba(var(--secondary-rgb), 0.32) 0%, rgba(255, 255, 255, 0.56) 100%)',
                  }}
                >
                  <div className="relative mb-6 overflow-hidden rounded-[1.25rem]">
                    <img
                      src={smartCard.coverImage}
                      alt={`${smartCard.displayName} image`}
                      className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(18,22,41,0.28)_0%,rgba(18,22,41,0.1)_100%)]" />
                    <span className="absolute left-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/65 text-[var(--primary)]">
                      <Cpu size={20} />
                    </span>
                  </div>
                  <h3 className={`${displayFont.className} text-[2rem] font-bold leading-tight text-[var(--text-primary)]`}>
                    {smartCard.displayName}
                  </h3>
                  <p className="mt-4 text-sm font-medium leading-relaxed text-[var(--text-secondary)]">
                    {smartCard.description}
                  </p>
                  <span className="mt-10 inline-flex h-11 w-full items-center justify-center rounded-[0.85rem] bg-[var(--text-primary)] text-sm font-bold text-white transition-transform duration-300 group-hover:-translate-y-0.5">
                    Open Wiki
                  </span>
                </Link>

                <Link
                  href={videoCard.href}
                  className="group relative overflow-hidden rounded-[2rem] p-8 shadow-[0_22px_52px_-34px_rgba(43,42,81,0.46)] transition-all duration-300 hover:-translate-y-1 lg:col-span-2"
                  style={{
                    background:
                      'linear-gradient(140deg, rgba(var(--secondary-rgb), 0.3) 0%, rgba(var(--primary-rgb), 0.15) 55%, rgba(255, 255, 255, 0.72) 100%)',
                  }}
                >
                  <div className="relative flex min-h-[230px] flex-col justify-between md:pr-[240px]">
                    <div className="max-w-[560px]">
                      <h3 className={`${displayFont.className} text-[2.1rem] font-bold leading-tight text-[var(--text-primary)]`}>
                        {videoCard.displayName}
                      </h3>
                      <p className="mt-4 text-sm font-medium leading-relaxed text-[var(--text-secondary)]">
                        {videoCard.description}
                      </p>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {videoTags.map((label) => (
                          <span
                            key={label}
                            className="rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-7 overflow-hidden rounded-[1.15rem] md:hidden">
                      <img
                        src={videoCard.coverImage}
                        alt={`${videoCard.displayName} image`}
                        className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="absolute right-0 top-1/2 hidden h-40 w-[220px] -translate-y-1/2 overflow-hidden rounded-[1.15rem] shadow-[0_18px_36px_-26px_rgba(18,22,41,0.75)] md:block">
                      <img
                        src={videoCard.coverImage}
                        alt={`${videoCard.displayName} image`}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(18,22,41,0.2)_0%,rgba(18,22,41,0.05)_100%)]" />
                    </div>

                    <span className="absolute right-0 top-1/2 inline-flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--text-primary)] text-white shadow-[0_14px_28px_-20px_rgba(18,22,41,0.9)] transition-transform duration-300 group-hover:scale-105 md:right-[84px]">
                      <Play size={18} fill="currentColor" />
                    </span>
                  </div>
                </Link>
              </div>

              <section className="mt-16">
                <div
                  className="rounded-[2rem] px-6 py-14 text-center shadow-[0_28px_70px_-42px_rgba(18,22,41,0.88)] sm:px-10"
                  style={{ backgroundColor: PALETTE.deepSurface }}
                >
                  <h3 className={`${displayFont.className} text-4xl font-bold text-white sm:text-5xl`}>
                    Need a Custom Roadmap?
                  </h3>
                  <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-relaxed text-[#F6D7D2]">
                    Our mentors are here to help you navigate the complexity of RoboGeex Wikiversity
                    with personalized guidance.
                  </p>
                  <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link
                      href="/editor/dashboard"
                      className="inline-flex h-12 items-center justify-center rounded-xl px-7 text-sm font-bold text-white"
                      style={{
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        boxShadow: '0 16px 28px -20px rgba(var(--primary-rgb), 0.75)',
                      }}
                    >
                      Talk to a Mentor
                    </Link>
                    <Link
                      href="/wikis"
                      className="inline-flex h-12 items-center justify-center rounded-xl bg-white/10 px-7 text-sm font-bold text-white"
                    >
                      View Curriculums
                    </Link>
                  </div>
                </div>
              </section>

              {extraCards.length > 0 && (
                <section className="mt-14">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className={`${displayFont.className} text-2xl font-bold text-[var(--text-primary)]`}>
                      More Wikis
                    </h3>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                      {extraCards.length} remaining
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {extraCards.map((card, index) => {
                      const tones = [
                        'linear-gradient(140deg, rgba(var(--primary-rgb), 0.24) 0%, rgba(255, 255, 255, 0.7) 100%)',
                        'linear-gradient(140deg, rgba(var(--secondary-rgb), 0.24) 0%, rgba(255, 255, 255, 0.72) 100%)',
                        'linear-gradient(140deg, rgba(var(--primary-rgb), 0.16) 0%, rgba(255, 255, 255, 0.72) 100%)',
                      ]

                      return (
                        <Link
                          key={card.slug}
                          href={card.href}
                          className="group rounded-[1.5rem] p-6 shadow-[0_16px_36px_-28px_rgba(43,42,81,0.45)] transition-all duration-300 hover:-translate-y-1"
                          style={{ background: tones[index % tones.length] }}
                        >
                          <div className="mb-4 overflow-hidden rounded-[1rem]">
                            <img
                              src={card.coverImage}
                              alt={`${card.displayName} image`}
                              className="h-32 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                          <span className="inline-flex rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
                            {card.gradeLabel}
                          </span>
                          <h4 className={`${displayFont.className} mt-4 text-2xl font-bold leading-tight text-[var(--text-primary)]`}>
                            {card.displayName}
                          </h4>
                          <p className="mt-3 line-clamp-2 text-sm font-medium leading-relaxed text-[var(--text-secondary)]">
                            {card.description}
                          </p>
                          <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
                            Explore
                            <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      </main>

      <footer
        className="mt-12 px-4 py-9 sm:px-6 lg:px-10"
        style={{ background: 'linear-gradient(180deg, #F9E8E5 0%, var(--surface) 100%)' }}
      >
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={`${displayFont.className} text-lg font-semibold text-[var(--text-primary)]`}>RoboGeex</p>
            <p className="text-xs font-medium">
              © 2026 RoboGeex Wiki Hub. Designed for the digital curator.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs font-bold uppercase tracking-[0.15em]">
            <Link href="/wikis">Documentation</Link>
            <Link href="/editor/dashboard">Support</Link>
            <Link href="/dashboard">Privacy Policy</Link>
            <Link href="/dashboard">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

