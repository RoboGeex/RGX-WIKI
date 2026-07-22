"use client"

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { CatalogEntry } from '@/lib/catalog'
import { CatalogCard } from './CatalogCard'
import { CatalogFilters, EMPTY_FILTERS, type FilterState } from './CatalogFilters'

const PAGE_SIZE = 9
const PAGE_STEP = 6

/**
 * Client island for /wikis. Entries are passed in from the server component
 * (already filtered to published wikis), so unlike the source there is no
 * client-side fetch and nothing unpublished is ever shipped to the browser.
 */
export function CatalogBrowser({
  entries,
  locale = 'en',
  initialQuery = '',
}: {
  entries: CatalogEntry[]
  locale?: 'en' | 'ar'
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (filters.categories.length > 0 && !entry.tags.some((t) => filters.categories.includes(t))) return false
      if (filters.levels.length > 0 && !filters.levels.includes(entry.gradeLabel)) return false
      if (q && !entry.searchable.includes(q)) return false
      return true
    })
  }, [entries, filters, query])

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [filters, query])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount
  const t = locale === 'ar'

  return (
    <>
      <div className="mb-8">
        <label className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-course focus-within:border-brand/60">
          <Search size={18} className="shrink-0 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t ? 'ابحث عن ويكي…' : 'Search the wikis…'}
            aria-label={t ? 'ابحث عن ويكي' : 'Search the wikis'}
            className="h-7 w-full bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink-muted"
          />
        </label>
      </div>

      <CatalogFilters value={filters} onChange={setFilters} entries={entries} locale={locale} />

      {filtered.length === 0 ? (
        <div className="cat-card border border-ink/10 p-12 text-center">
          <p className="cat-display text-lg font-semibold text-ink">
            {t ? 'لا توجد نتائج مطابقة.' : 'No wikis matched.'}
          </p>
          <p className="mt-1 text-ink-muted">
            {t ? 'جرّب كلمة أخرى أو امسح عوامل التصفية.' : 'Try another keyword, or clear the filters.'}
          </p>
          <button
            type="button"
            onClick={() => { setFilters(EMPTY_FILTERS); setQuery('') }}
            className="mt-5 rounded-full border border-ink/15 px-5 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand/50 hover:text-ink"
          >
            {t ? 'مسح' : 'Clear'}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-ink-muted">
            {t
              ? `عرض ${visible.length} من ${filtered.length}`
              : `Showing ${visible.length} of ${filtered.length}`}
          </div>

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
                {t ? 'عرض المزيد' : 'Show more'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
