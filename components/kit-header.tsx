'use client'
// Force new build
import { useEffect, useState } from 'react'
import { getKits, getLessons, Lesson } from '@/lib/data'
import Link from 'next/link'
import SearchPanel from './search-panel'
import { i18n, t, Locale } from '@/lib/i18n'

export default function KitHeader({ lang, kitSlug, lessonSlug }: { lang: Locale; kitSlug: string, lessonSlug: string }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [lessonsForWiki, setLessonsForWiki] = useState<(Lesson & { kitSlug: string })[]>([]);

  useEffect(() => {
    const fetchLessonsForWiki = async () => {
      const allKits = getKits();
      const currentKit = allKits.find(k => k.slug === kitSlug);
      const currentWikiSlug = currentKit?.wikiSlug;

      if (currentWikiSlug) {
        const kitsInSameWiki = allKits.filter(k => k.wikiSlug === currentWikiSlug);
        const lessonPromises = kitsInSameWiki.map(async k => {
          const lessons = await getLessons(k.slug);
          return lessons.map(l => ({ ...l, kitSlug: k.slug }));
        });
        const lessonsFromAllKits = await Promise.all(lessonPromises);
        setLessonsForWiki(lessonsFromAllKits.flat());
      } else {
        const lessons = await getLessons(kitSlug);
        setLessonsForWiki(lessons.map(l => ({ ...l, kitSlug })));
      }
    };

    fetchLessonsForWiki();
  }, [kitSlug]);

  const otherLocale = i18n.locales.find((l) => l !== lang);

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
            placeholder={t('search', lang)}
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
