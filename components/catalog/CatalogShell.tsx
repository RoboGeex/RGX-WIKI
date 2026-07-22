"use client"

import { useEffect, useMemo, useState } from 'react'
import type { CatalogEntry } from '@/lib/catalog'
import { getCatalogMessages, type CatalogLocale } from '@/lib/catalog-i18n'
import { CatalogHeader } from './CatalogHeader'
import { CatalogCard } from './CatalogCard'
import { CatalogFilters, EMPTY_FILTERS, type FilterState } from './CatalogFilters'

const PAGE_SIZE = 9
const PAGE_STEP = 6

// Accreditations / partnerships shown under the hero, as on courses.robogeex.com.
const PARTNERS = [
  { src: '/images/partners/arduino-education.png', alt: 'Arduino Education Partner' },
  { src: '/images/partners/printlab.png', alt: 'PrintLab' },
  { src: '/images/partners/first-global.png', alt: 'FIRST Global' },
  { src: '/images/partners/autodesk-atc.png', alt: 'Autodesk Authorized Training Center' },
  { src: '/images/partners/stem-accredited.png', alt: 'STEM.org Accredited Educational Program' },
  { src: '/images/partners/best-in-stem.png', alt: 'Best in STEM' },
]

/**
 * Header + hero + faceted grid, matching the robogeex_courses layout.
 * Client-side because the header's search box drives the grid, exactly as
 * it does on courses.robogeex.com.
 */
export function CatalogShell({
  entries,
  locale,
  basePath,
  initialQuery = '',
}: {
  entries: CatalogEntry[]
  locale: CatalogLocale
  basePath: string
  initialQuery?: string
}) {
  const t = getCatalogMessages(locale)
  const [query, setQuery] = useState(initialQuery)
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (filters.categories.length > 0 && !entry.tags.some((tag) => filters.categories.includes(tag))) return false
      if (filters.levels.length > 0 && !filters.levels.includes(entry.gradeLabel)) return false
      if (q && !entry.searchable.includes(q)) return false
      return true
    })
  }, [entries, filters, query])

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [filters, query])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  return (
    <>
      <CatalogHeader locale={locale} basePath={basePath} query={query} onQueryChange={setQuery} />

      {/* Hero — 5/7 split with partner strip, as on courses.robogeex.com */}
      <section className="border-b border-ink/5 bg-ink/[0.03]">
        <div className="grid min-h-[420px] items-stretch lg:grid-cols-[5fr_7fr]">
          <div className="flex items-center px-6 pb-12 pt-8 sm:px-10 lg:pb-14 lg:pe-10 lg:ps-16 lg:pt-10">
            <div className="w-full max-w-xl">
              <h1 className="cat-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink lg:text-5xl">
                {t.hero.title}
              </h1>
              <p className="mt-5 text-lg text-ink-soft">{t.hero.subtitle}</p>
              <p className="mt-3 text-base text-ink-muted">{t.hero.sub2}</p>

              <div className="mt-8">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted/70">
                  {t.hero.partnership}
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  {PARTNERS.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.src}
                      src={p.src}
                      alt={p.alt}
                      title={p.alt}
                      loading="lazy"
                      className="h-10 w-auto object-contain opacity-80 transition hover:opacity-100 sm:h-12"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <a
                  href="#courses"
                  className="inline-flex rounded-full bg-brand px-7 py-3 text-base font-bold text-white transition hover:bg-brand-600"
                >
                  {t.hero.cta}
                </a>
              </div>
            </div>
          </div>

          <div className="relative min-h-[260px] lg:min-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <main id="courses" className="mx-auto w-full max-w-7xl flex-1 scroll-mt-24 px-4 py-10 sm:px-6 lg:px-8">
        <CatalogFilters value={filters} onChange={setFilters} entries={entries} locale={locale} />

        {filtered.length === 0 ? (
          <div className="cat-card border border-ink/10 p-12 text-center">
            <p className="cat-display text-lg font-semibold text-ink">{t.list.emptyTitle}</p>
            <p className="mt-1 text-ink-muted">{t.list.emptySubtitle}</p>
            <button
              type="button"
              onClick={() => { setFilters(EMPTY_FILTERS); setQuery('') }}
              className="mt-5 rounded-full border border-ink/15 px-5 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand/50 hover:text-ink"
            >
              {t.list.clear}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-ink-muted">{t.list.showingOf(visible.length, filtered.length)}</div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((entry) => (
                <CatalogCard key={entry.slug} entry={entry} locale={locale} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + PAGE_STEP)}
                  className="rounded-full border border-ink/15 bg-white px-8 py-3 text-base font-semibold text-ink-soft transition hover:border-brand/50 hover:text-ink"
                >
                  {t.list.showMore}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
