'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Globe, Menu, ChevronDown, LayoutDashboard } from 'lucide-react'
import { Locale, t } from '../lib/i18n'
import { setStoredLocale } from '../lib/unlock'
import SearchPanel from './search-panel'
import type { Lesson } from '../lib/types'
import { buildDefaultLessonHref, buildKitHomeHref, buildLessonHref, buildResourcesHref, stripLegacyDraftSuffix, isSpecialLessonSlug, DEFAULT_LESSON_SLUG, RESOURCES_LESSON_SLUG } from '@/lib/wikiPaths'

interface Props {
  locale: Locale
  kitSlug: string
  lessons: Lesson[]
  defaultLessonSlug?: string
  resourcesUrl?: string
  isHubDomain?: boolean
  showStudentDashboardLink?: boolean
  onLocaleChange: (l: Locale) => void
  onMenuClick: () => void
}

export default function Navbar({
  locale,
  kitSlug,
  lessons,
  defaultLessonSlug,
  resourcesUrl,
  isHubDomain = false,
  showStudentDashboardLink = false,
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
      .filter((lesson) => !isSpecialLessonSlug(lesson))
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
  }, [lessons])

  const gettingStartedHref = buildDefaultLessonHref({
    locale: safeLocale,
    kitSlug,
    defaultLessonSlug,
    isHubDomain,
  })
  const kitHomeHref = buildKitHomeHref({ locale: safeLocale, kitSlug, isHubDomain })
  const customResourcesHref =
    resourcesUrl && /^(https?:)?\/\//i.test(resourcesUrl)
      ? resourcesUrl
      : undefined
  const resourcesHref = customResourcesHref || buildResourcesHref({ locale: safeLocale, kitSlug, isHubDomain })
  const normalizePath = (value?: string | null) => {
    if (!value) return ''
    const cleaned = value.split('?')[0].replace(/\/+$/, '')
    return cleaned || '/'
  }
  const currentPath = normalizePath(pathname)
  const defaultSlug = (defaultLessonSlug || 'getting-started').trim()
  const gettingStartedPaths = new Set<string>([
    normalizePath(gettingStartedHref),
    normalizePath(kitHomeHref),
    normalizePath(`/${safeLocale}/${kitSlug}/lesson/${defaultSlug}`),
    normalizePath(`/${kitSlug}/${safeLocale}/lesson/${defaultSlug}`),
  ])
  const resourcesPaths = new Set<string>([
    normalizePath(resourcesHref),
    normalizePath(`/${safeLocale}/${kitSlug}/lesson/resources`),
    normalizePath(`/${kitSlug}/${safeLocale}/lesson/resources`),
  ])
  const isGettingStartedActive = gettingStartedPaths.has(currentPath)
  const isResourcesActive = resourcesPaths.has(currentPath)
  const isLessonsPage = pathname?.includes(`/lesson/`) && !isGettingStartedActive && !isResourcesActive
  const buildLessonLink = (slug: string) =>
    buildLessonHref({ locale: safeLocale, kitSlug, lessonSlug: slug, isHubDomain })

  return (
    <nav dir="ltr" className="bg-[#1e1e1e] w-full border-b border-transparent fixed top-0 left-0 right-0 z-40 backdrop-blur">
      <div className="relative w-full max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-white/10 text-white"
            onClick={onMenuClick}
            aria-label="Menu"
          >
            <Menu size={24} />
          </button>
          <Link href={kitHomeHref} className="flex items-center gap-2">
            <img src="/images/robogeex-logo.png" alt="RoboGeex Academy" className="w-[120px] sm:w-[150px] md:w-[184px] h-auto" />
            <span className="sr-only">RoboGeex Academy</span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
          <Link
            href={gettingStartedHref}
            className={isGettingStartedActive ? 'text-primary/80 border-b-2 border-primary/80 pb-1' : 'text-white/80 hover:text-primary pb-1 transition-colors'}
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
                  {(() => {
                    let displayIdx = 0;
                    return sortedLessons.map((lesson) => {
                      const isSpecial = isSpecialLessonSlug(lesson);
                      if (!isSpecial) displayIdx++;
                      
                      const isActive = pathname?.endsWith(`/${lesson.slug}`) || pathname?.endsWith(`/${lesson.slug}--draft`);

                      return (
                        <Link
                          key={lesson.id}
                          href={buildLessonLink(lesson.slug)}
                          className={`block px-3 py-2 text-sm transition ${
                            isActive 
                              ? "bg-primary/10 text-primary font-bold" 
                              : "text-gray-700 hover:bg-primary/10 hover:text-primary"
                          }`}
                          onClick={() => setLessonsOpen(false)}
                        >
                          <div className="font-medium">
                            {!isSpecial && <span className="mr-1">{displayIdx}.</span>}
                            {safeLocale === 'ar' ? lesson.title_ar : lesson.title_en}
                          </div>
                          <div className="text-[10px] text-gray-400">{lesson.duration_min}m · {lesson.difficulty}</div>
                        </Link>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          <Link
            href={resourcesHref}
            className={isResourcesActive ? 'text-primary/80 border-b-2 border-primary/80 pb-1' : 'text-white/80 hover:text-primary pb-1 transition-colors'}
          >
            {t('resources', safeLocale)}
          </Link>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {showStudentDashboardLink && (
            <Link
              href="/home"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/30 px-3 text-sm font-medium text-white transition hover:bg-white/10"
              aria-label="Back to student dashboard"
              title="Back to student dashboard"
            >
              <LayoutDashboard size={16} />
              <span className="hidden lg:inline">Dashboard</span>
            </Link>
          )}

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
                isHubDomain={isHubDomain}
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
            <span>{safeLocale === 'en' ? 'AR' : 'EN'}</span>
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
              isHubDomain={isHubDomain}
              onClose={() => setSearchOpen(false)}
            />
          </div>
        )}
      </div>
    </nav>
  )
}
