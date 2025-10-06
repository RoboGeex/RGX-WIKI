'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Globe, Menu, ChevronDown } from 'lucide-react'
import { Locale, t } from '../lib/i18n'
import { setStoredLocale } from '../lib/unlock'
import SearchPanel from './search-panel'
import type { Lesson } from '../lib/types'

interface Props {
  locale: Locale
  kitSlug: string
  lessons: Lesson[]
  defaultLessonSlug?: string
  resourcesUrl?: string
  onLocaleChange: (l: Locale) => void
  onMenuClick: () => void
}

export default function Navbar({
  locale,
  kitSlug,
  lessons,
  defaultLessonSlug,
  resourcesUrl,
  onLocaleChange,
  onMenuClick,
}: Props) {
  const safeLocale: Locale = locale && (locale === 'en' || locale === 'ar') ? locale : 'en'
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [lessonsOpen, setLessonsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const changeLocale = () => {
    const next = safeLocale === 'en' ? 'ar' : 'en'
    setStoredLocale(next)
    onLocaleChange(next)
  }

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLessonsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sortedLessons = useMemo(() => {
    return lessons
      .filter(lesson => lesson.slug !== 'getting-started')
      .sort((a, b) => a.order - b.order)
  }, [lessons])

  const gettingStartedHref = `/${safeLocale}/getting-started`
  const resourcesHref = resourcesUrl || `/${safeLocale}/${kitSlug}/resources`
  const isLessonsPage = pathname?.includes(`/lesson/`) && pathname !== gettingStartedHref

  return (
    <nav className="bg-[#1e1e1e] w-full border-b border-transparent fixed top-0 left-0 right-0 z-40 backdrop-blur">
      <div className="relative max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-white/10"
            onClick={onMenuClick}
            aria-label="Menu"
          >
            <Menu size={18} />
          </button>
          <Link href={`/${safeLocale}/${kitSlug}`} className="flex items-center gap-2">
            <img src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={184} height={64} />
            <span className="sr-only">RoboGeex Academy</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
          <Link
            href={gettingStartedHref}
            className={pathname === gettingStartedHref ? 'text-primary/80 border-b-2 border-primary/80 pb-1' : 'text-white/80 hover:text-primary pb-1 transition-colors'}
          >
            {t('gettingStarted', safeLocale)}
          </Link>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setLessonsOpen((prev) => !prev)}
              className={isLessonsPage ? 'flex items-center gap-1 text-primary/80 border-b-2 border-primary/80 pb-1' : 'flex items-center gap-1 text-white/80 hover:text-primary pb-1 transition-colors'}
            >
              {t('lessons', safeLocale)} <ChevronDown size={14} />
            </button>
            {lessonsOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg z-50">
                <div className="p-3 text-xs uppercase tracking-wider text-gray-500">{t('lessons', safeLocale)}</div>
                <div className="divide-y divide-gray-100">
                  {sortedLessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={`/${safeLocale}/${lesson.slug}`}
                      className="block px-3 py-2 text-sm text-gray-700 hover:bg-primary/10 hover:text-primary transition"
                      onClick={() => setLessonsOpen(false)}
                    >
                      <div className="font-medium">{safeLocale === 'ar' ? lesson.title_ar : lesson.title_en}</div>
                      <div className="text-[10px] text-gray-400">{lesson.duration_min}m آ· {lesson.difficulty}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link
            href={resourcesHref}
            className={pathname === resourcesHref ? 'text-primary/80 border-b-2 border-primary/80 pb-1' : 'text-white/80 hover:text-primary pb-1 transition-colors'}
          >
            {t('resources', safeLocale)}
          </Link>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative hidden sm:block w-56">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setSearchOpen(e.target.value.length > 0); }}
              onFocus={() => setSearchOpen(query.length > 0)}
              placeholder={t('search', safeLocale)}
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            {searchOpen && (
              <SearchPanel
                query={query}
                locale={safeLocale}
                kitSlug={kitSlug}
                onClose={() => setSearchOpen(false)}
              />
            )}
          </div>

          <button
            onClick={changeLocale}
            className="px-3 py-2 rounded-md border border-white/30 text-white text-sm flex items-center gap-2 transition hover:bg-white/10"
            dir={safeLocale === 'ar' ? 'rtl' : 'ltr'}
          >
            <Globe size={14} />
            <span>{safeLocale.toUpperCase()}</span>
          </button>
        </div>
      </div>

      <div className="sm:hidden pb-3 px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={16} />
          <input
            type="text"
            placeholder={t('search', safeLocale)}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(e.target.value.length > 0); }}
            onFocus={() => setSearchOpen(query.length > 0)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
        {searchOpen && (
          <div className="px-0">
            <SearchPanel
              query={query}
              locale={safeLocale}
              kitSlug={kitSlug}
              onClose={() => setSearchOpen(false)}
            />
          </div>
        )}
      </div>
    </nav>
  )
}
