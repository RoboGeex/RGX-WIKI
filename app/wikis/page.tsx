import { getWikis, getKits } from '@/lib/data'
import Link from 'next/link'
import { ArrowRight, Search, Sparkles } from 'lucide-react'
import { Manrope, Sora } from 'next/font/google'
import { getWikisFromDb } from '@/lib/server-data'

const headingFont = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
})

const bodyFont = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const CARD_PALETTES = [
  { top: '#ecfeff', middle: '#cffafe', accent: '#0e7490' },
  { top: '#fefce8', middle: '#fef3c7', accent: '#b45309' },
  { top: '#ecfdf3', middle: '#d1fae5', accent: '#047857' },
  { top: '#eef2ff', middle: '#dbeafe', accent: '#1d4ed8' },
  { top: '#fdf4ff', middle: '#fae8ff', accent: '#a21caf' },
  { top: '#fff1f2', middle: '#ffe4e6', accent: '#be123c' },
]

type WikisPageProps = {
  searchParams?: {
    q?: string
  }
}

export default async function WikisLandingPage({ searchParams }: WikisPageProps) {
  const dbWikis = await getWikisFromDb()
  const wikis = dbWikis.length > 0 ? dbWikis : getWikis()
  const kits = getKits()
  const query = (searchParams?.q || '').trim().toLowerCase()
  const kitsByWikiSlug = new Map(kits.map((kit) => [kit.wikiSlug, kit]))

  const wikiCards = wikis
    .map((wiki) => {
      const displayName = wiki.displayName || wiki.slug
      const primaryDomain = (wiki.domains || []).find((domain) => domain && domain.trim())
      const hasDedicatedDomain = Boolean(primaryDomain && primaryDomain.trim().length)
      const normalizedDomain = primaryDomain?.replace(/https?:\/\//i, '').replace(/\/$/, '')
      const locale = wiki.defaultLocale || 'en'
      const href = hasDedicatedDomain ? `https://${normalizedDomain}` : `/${locale}/${wiki.slug}`
      const kitMatch = kitsByWikiSlug.get(wiki.slug)
      const description =
        kitMatch?.overview_en ||
        `Learning content and immersive experiences for the ${displayName} environment.`
      const gradeLabel =
        'grade' in wiki && typeof (wiki as any).grade === 'string'
          ? (wiki as any).grade.toUpperCase()
          : 'ALL LEVELS'
      const searchable = [displayName, wiki.slug, description, gradeLabel].join(' ').toLowerCase()

      return {
        slug: wiki.slug,
        displayName,
        description,
        gradeLabel,
        href,
        domain: normalizedDomain,
        coverImage: wiki.picture || '',
        searchable,
      }
    })
    .filter((card) => !query || card.searchable.includes(query))

  return (
    <div
      className={`${bodyFont.className} min-h-screen bg-[#fbfcff] text-[#111827]`}
      style={{
        backgroundImage:
          'radial-gradient(circle at 12% 12%, rgba(56,189,248,0.14), transparent 32%), radial-gradient(circle at 88% 8%, rgba(251,191,36,0.18), transparent 30%), linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%)',
      }}
    >
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img src="/images/robogeex-logo.png" alt="RoboGeex" className="h-8 w-auto" />
            <span className={`${headingFont.className} hidden text-sm font-bold tracking-[0.18em] text-slate-700 sm:block`}>
              WIKI HUB
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 lg:flex">
            <Link href="/wikis" className="text-[#f05d4e]">
              Wikis
            </Link>
            <Link href="/" className="transition-colors hover:text-slate-900">
              Home
            </Link>
            <Link href="/editor/dashboard" className="transition-colors hover:text-slate-900">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="w-full pb-20 pt-10 lg:pt-14">
        <section className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.45)] sm:p-10 lg:p-12">
          <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-sky-200/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-amber-200/40 blur-3xl" />

          <div className="relative space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f05d4e]/25 bg-[#f05d4e]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#b54135]">
              <Sparkles size={14} />
              Discover And Launch
            </div>

            <div className="max-w-4xl space-y-4">
              <h1 className={`${headingFont.className} text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-6xl`}>
                RoboGeex Learning Wikis
              </h1>
              <p className="max-w-2xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                Browse every kit in one place, jump into lesson paths faster, and find the exact learning track your class needs.
              </p>
            </div>

            <form action="/wikis" method="get" className="max-w-2xl">
              <label htmlFor="wiki-search" className="sr-only">
                Search wikis
              </label>
              <div className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.65)] transition-all focus-within:border-[#f05d4e]/40 focus-within:shadow-[0_16px_40px_-24px_rgba(240,93,78,0.45)]">
                <Search className="text-slate-400 group-focus-within:text-[#f05d4e]" size={18} />
                <input
                  id="wiki-search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search by wiki name, slug, grade, or topic..."
                  className="h-8 w-full border-0 bg-transparent text-sm font-semibold text-slate-700 placeholder:font-medium placeholder:text-slate-400 focus:outline-none sm:text-[15px]"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-slate-800"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
          </div>
        </section>

        <section className="mt-10 w-full px-6 sm:px-10 lg:px-16 xl:px-24">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className={`${headingFont.className} text-2xl font-bold text-slate-900 sm:text-3xl`}>
              {query ? `Results for "${query}"` : 'All Wikis'}
            </h2>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              {wikiCards.length} wiki{wikiCards.length === 1 ? '' : 's'}
            </p>
          </div>

          {wikiCards.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className={`${headingFont.className} text-xl font-bold text-slate-900`}>No wikis matched your search.</p>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Try another keyword or clear the search input.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5">
              {wikiCards.map((wikiCard, index) => {
                const palette = CARD_PALETTES[index % CARD_PALETTES.length]
                return (
                  <Link
                    key={wikiCard.slug}
                    href={wikiCard.href}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-[#f8f8f8] shadow-[0_8px_24px_-18px_rgba(15,23,42,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_-18px_rgba(15,23,42,0.45)]"
                  >
                    <div className="relative">
                      <div
                        className="absolute inset-x-0 top-0 h-full"
                        style={{
                          background: `linear-gradient(140deg, ${palette.top}, ${palette.middle})`,
                        }}
                      />
                      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-slate-200">
                        <div className="h-full w-full">
                            {wikiCard.coverImage ? (
                              <img
                                src={wikiCard.coverImage}
                                alt={`${wikiCard.displayName} cover`}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                Cover Image
                              </div>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="flex h-[210px] flex-col p-3.5">
                      <div className="mb-2">
                        <span className="inline-flex rounded-md bg-[#e7e7e7] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700">
                          {wikiCard.gradeLabel}
                        </span>
                      </div>
                      <h3 className={`${headingFont.className} line-clamp-2 text-xl font-semibold leading-tight text-slate-900`}>
                        {wikiCard.displayName}
                      </h3>
                      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-700">
                        {wikiCard.description}
                      </p>

                      <div className="mt-auto pt-3">
                        <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#e13a2d] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors group-hover:bg-[#cd3024]">
                          View Course
                          <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
