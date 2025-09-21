'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Lesson } from '@/lib/data'
import type { Locale } from '@/lib/i18n'

export default function SearchPanel(
  { query, lessons, locale, kitSlug, onClose }:
  { query: string; lessons: Lesson[]; locale: Locale; kitSlug: string; onClose: () => void }
) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  const filtered = lessons.filter(l =>
    (locale === 'ar' ? l.title_ar : l.title_en).toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6)
  return (
    <div
      ref={ref}
      className="absolute top-full mt-2 w-full bg-white border rounded-xl shadow-lg overflow-hidden z-[70]"
    >
      {filtered.length === 0 && (
        <div className="p-4 text-sm text-gray-500">No results</div>
      )}
      {filtered.map(l => (
        <Link
          key={l.id}
          href={`/${locale}/${kitSlug}/lesson/${l.slug}`}
          onClick={onClose}
          className="block px-4 py-3 hover:bg-gray-100 text-sm"
        >
          <div className="font-medium">
            {locale === 'ar' ? l.title_ar : l.title_en}
          </div>
          <div className="text-xs text-gray-500">
            {l.duration_min}m - {l.difficulty}
          </div>
        </Link>
      ))}
    </div>
  )
}
