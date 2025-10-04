'use client'

import { useMemo, useState } from 'react'
import { getKits, getLessons } from '@/lib/data'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import SearchPanel from './search-panel'
import * as i18n from '@/lib/i18n'

export default function KitHeader({ lang, kitSlug, lessonSlug }: { lang: i18n.Locale; kitSlug: string, lessonSlug: string }) {
  const [searchQuery, setSearchQuery] = useState('')

  const lessonsForWiki = useMemo(() => {
    const allKits = getKits();
    // Find the current kit to identify its wiki
    const currentKit = allKits.find(k => k.slug === kitSlug);
    const currentWikiSlug = currentKit?.wikiSlug;

    if (currentWikiSlug) {
      // Get all kits belonging to the same wiki
      const kitsInSameWiki = allKits.filter(k => k.wikiSlug === currentWikiSlug);
      // Get all lessons from all kits in the same wiki
      return kitsInSameWiki.flatMap(k => getLessons(k.slug).map(l => ({ ...l, kitSlug: k.slug })));
    } else {
      // Fallback for kits not associated with a wiki
      return getLessons(kitSlug).map(l => ({ ...l, kitSlug }));
    }
  }, [kitSlug]);

  const otherLocale = i18n.i18n.locales.find((l) => l !== lang);

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center space-x-4">
        <Link href={`/${lang}/${kitSlug}`}>
          <h1 className="text-xl font-bold">{kitSlug}</h1>
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder={i18n.t('search', lang)}
            className="px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && 
            <SearchPanel 
              query={searchQuery} 
              lessons={lessonsForWiki} 
              locale={lang} 
              onClose={() => setSearchQuery('')} 
              kitSlug={kitSlug} 
            />
          }
        </div>
        {otherLocale && (
          <Link href={`/${otherLocale}/${kitSlug}/${lessonSlug}`} locale={otherLocale}>
            {otherLocale.toUpperCase()}
          </Link>
        )}
      </div>
    </header>
  )
}
