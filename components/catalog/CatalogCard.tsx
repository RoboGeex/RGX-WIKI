"use client"

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { CatalogEntry } from '@/lib/catalog'
import { getCatalogMessages } from '@/lib/catalog-i18n'

/**
 * Ported from robogeex_courses' CourseCard: 16:9 cover, level badge overlay,
 * category chips, clamped description. The source's two outbound buttons
 * (overviewLink/courseLink) are replaced by a single link to the real wiki —
 * that is the whole point of the merge.
 */

// Colour the fallback cover by the first tag, so untitled wikis still look
// intentional. Keys are lowercased tag names.
const TAG_GRADIENT: Record<string, string> = {
  robotics: 'from-brand-400 to-brand-600',
  coding: 'from-indigo-400 to-indigo-600',
  ai: 'from-violet-400 to-violet-600',
  'digital fabrication': 'from-amber-400 to-orange-500',
  graphics: 'from-pink-400 to-pink-600',
  'assistive technology': 'from-emerald-400 to-teal-600',
}
const FALLBACK_GRADIENT = 'from-ink/40 to-ink'

export function CatalogCard({ entry, locale = 'en' }: { entry: CatalogEntry; locale?: 'en' | 'ar' }) {
  const description = locale === 'ar' ? entry.description_ar : entry.description_en
  const gradient = TAG_GRADIENT[(entry.tags[0] || '').toLowerCase()] ?? FALLBACK_GRADIENT
  const isExternal = /^https?:\/\//i.test(entry.href)

  const cover = entry.coverImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={entry.coverImage} alt={entry.displayName} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
  ) : (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
      <span className="px-6 text-center text-2xl font-bold tracking-tight text-white/90">{entry.displayName}</span>
    </div>
  )

  const body = (
    <>
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {cover}
        <div className="absolute start-3 top-3">
          <span className="cat-badge bg-white/95 text-ink">{entry.gradeLabel}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {entry.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {entry.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="cat-badge bg-brand/10 text-brand-700">{tag}</span>
            ))}
          </div>
        )}

        <h3 className="cat-display mb-2 text-lg font-bold leading-snug text-ink">{entry.displayName}</h3>
        <p className="mb-5 line-clamp-3 text-sm text-ink-muted">{description}</p>

        <span className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-brand-600">
          {getCatalogMessages(locale).card.goto}
          <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180" />
        </span>
      </div>
    </>
  )

  const className =
    'cat-card group flex h-full flex-col border border-ink/10 transition-shadow hover:shadow-course'

  // A wiki on its own domain needs a real anchor; in-app wikis use Link.
  return isExternal ? (
    <a href={entry.href} className={className}>{body}</a>
  ) : (
    <Link href={entry.href} className={className}>{body}</Link>
  )
}
