"use client"

import { useMemo, useState } from 'react'
import type { CatalogEntry } from '@/lib/catalog'

/**
 * Ported from robogeex_courses' CourseFilters, reduced to the two facets the
 * wiki data actually has: Category (Wiki.tags) and Level (Wiki.grade).
 * The source's four-tab version would render three near-empty tabs here.
 *
 * The valuable part is kept: facet counts are computed against the OTHER
 * active groups (`matchesExcept`), so each chip shows how many results it
 * would yield, and options that would yield none are hidden entirely.
 */
export type FilterState = { categories: string[]; levels: string[] }
export const EMPTY_FILTERS: FilterState = { categories: [], levels: [] }

type Group = 'categories' | 'levels'

function valuesFor(entry: CatalogEntry, group: Group): string[] {
  return group === 'categories' ? entry.tags : [entry.gradeLabel]
}

function matchesExcept(entry: CatalogEntry, filters: FilterState, except: Group) {
  const groups: Group[] = ['categories', 'levels']
  return groups.every((g) => {
    if (g === except) return true
    const active = filters[g]
    if (active.length === 0) return true
    return valuesFor(entry, g).some((v) => active.includes(v))
  })
}

function Chip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'border-brand bg-brand text-white'
          : 'border-ink/15 bg-white text-ink-soft hover:border-brand/50 hover:text-ink'
      }`}
    >
      {label}
      <span className={`text-xs font-bold ${active ? 'text-white/80' : 'text-ink-muted'}`}>{count}</span>
    </button>
  )
}

export function CatalogFilters({
  value,
  onChange,
  entries,
  locale = 'en',
}: {
  value: FilterState
  onChange: (next: FilterState) => void
  entries: CatalogEntry[]
  locale?: 'en' | 'ar'
}) {
  const [tab, setTab] = useState<Group>('categories')

  const ALL_TABS: { key: Group; label: string }[] = [
    { key: 'categories', label: locale === 'ar' ? 'الفئة' : 'Category' },
    { key: 'levels', label: locale === 'ar' ? 'المستوى' : 'Level' },
  ]

  // Only offer a facet that can actually partition the results. Today every
  // wiki has grade "All Levels" and almost none have tags, so a facet with
  // fewer than 2 distinct values would render an empty or single-option bar
  // and read as broken. These tabs appear automatically once wikis are tagged
  // (Wiki.tags) or given real grades — no code change needed.
  const TABS = useMemo(
    () =>
      ALL_TABS.filter((t) => {
        const distinct = new Set<string>()
        for (const entry of entries) for (const v of valuesFor(entry, t.key)) if (v) distinct.add(v)
        return distinct.size >= 2
      }),
    [entries, locale],
  )

  // Keep the active tab valid as data changes.
  const activeTab: Group = TABS.some((t) => t.key === tab) ? tab : (TABS[0]?.key ?? 'categories')

  // Options for the active tab, each with a count reflecting the other filters.
  const options = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of entries) {
      if (!matchesExcept(entry, value, activeTab)) continue
      for (const v of valuesFor(entry, activeTab)) {
        if (!v) continue
        counts.set(v, (counts.get(v) || 0) + 1)
      }
    }
    return Array.from(counts.entries())
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [entries, value, activeTab])

  const activeCount = value.categories.length + value.levels.length

  function toggle(group: Group, option: string) {
    const active = value[group]
    const next = active.includes(option) ? active.filter((v) => v !== option) : [...active, option]
    onChange({ ...value, [group]: next })
  }

  // Nothing worth filtering on yet — render nothing rather than an empty bar.
  if (entries.length === 0 || TABS.length === 0) return null

  return (
    <div className="mb-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const n = value[t.key].length
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                activeTab === t.key ? 'bg-ink text-white' : 'bg-ink/5 text-ink-soft hover:bg-ink/10'
              }`}
            >
              {t.label}
              {n > 0 && (
                <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{n}</span>
              )}
            </button>
          )
        })}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="ms-auto text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            {locale === 'ar' ? `مسح ${activeCount} من عوامل التصفية` : `Clear ${activeCount} filter${activeCount > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {options.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {locale === 'ar' ? 'لا توجد خيارات.' : 'No options available.'}
          </p>
        ) : (
          options.map(([option, count]) => (
            <Chip
              key={option}
              label={option}
              count={count}
              active={value[activeTab].includes(option)}
              onClick={() => toggle(activeTab, option)}
            />
          ))
        )}
      </div>
    </div>
  )
}
