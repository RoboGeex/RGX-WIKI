'use client'

import { useMemo, useState } from 'react'
import { getKits, getLessons } from '@/lib/data'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import SearchPanel from './search-panel'
import { Locale, i18n } from '@/lib/i18n'

export default function KitHeader({ lang, kitSlug, lessonSlug }: { lang: Locale; kitSlug: string, lessonSlug: string }) {
  const [searchQuery, setSearchQuery] = useState('')

  const lessonsForWiki = useMemo(() => {
    const allKits = getKits();
    // Find the current kit to identify its wiki
    const currentKit = allKits.find(k => k.slug === kitSlug);
    const currentWikiSlug = currentKit?.wikiSlug;

    // Filter kits to only include those belonging to the same wiki
    const kitsForWiki = currentWikiSlug
        ? allKits.filter(k => k.wikiSlug === currentWikiSlug)
        : currentKit ? [currentKit] : []; // Fallback for kits without a wiki
    
    // Gather lessons only from the kits in the current wiki
    return kitsForWiki.flatMap(kit =>
        getLessons(kit.slug).map(lesson => ({ ...lesson, kitSlug: kit.slug }))
    );
  }, [kitSlug])

  const params = useParams()
  const otherLocale = i18n.locales.find(l => l !== params.locale)

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-[60]">
      <div className="px-5">
        <div className="flex items-center justify-between h-16">
          <div className="text-lg font-bold">Arduino</div>
          <div className="flex-1 flex justify-center px-10">
            <div className="relative w-full max-w-lg">
              <input
                type="text"
                placeholder="Search for lessons..."
                className="w-full pl-4 pr-10 py-2 border rounded-full bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>
              {searchQuery && (
                <SearchPanel 
                  query={searchQuery} 
                  lessons={lessonsForWiki} 
                  locale={lang} 
                  kitSlug={kitSlug}
                  onClose={() => setSearchQuery('')}
                />
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href={`/${otherLocale}/${kitSlug}/${lessonSlug}`}>[ {otherLocale} ]</Link>
            <div>User</div>
          </div>
        </div>
      </div>
    </header>
  )
}
