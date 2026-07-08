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
  dashboardLink?: {
    href: string
    ariaLabel: string
  }
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
  dashboardLink,
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
            className={isGettingStartedActive ? 'text-primary/80 border-b-2 border-primary/80 pb-1' : 'link-underline text-white/80 hover:text-primary pb-1 transition-colors'}
          >
            {t('gettingStarted', safeLocale)}
          </Link>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setLessonsOpen((prev) => !prev)}
              aria-expanded={lessonsOpen}
              aria-haspopup="menu"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                isLessonsPage || lessonsOpen
                  ? 'bg-white/10 text-primary'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t('lessons', safeLocale)}
              <ChevronDown size={14} className={`transition-transform ${lessonsOpen ? 'rotate-180' : ''}`} />
            </button>
            {lessonsOpen && (
              <div
                role="menu"
                className="animate-menu-in absolute left-0 top-full z-50 mt-3 w-80 max-h-[70vh] overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/5"
              >
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{t('lessons', safeLocale)}</div>
                <div className="max-h-[calc(70vh-44px)] space-y-1 overflow-y-auto p-2">
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
                          role="menuitem"
                          className={`group block rounded-xl px-3 py-2.5 text-sm transition ${
                            isActive 
                              ? "bg-primary/10 text-primary shadow-sm"
                              : "text-slate-700 hover:bg-slate-50 hover:text-primary"
                          }`}
                          onClick={() => setLessonsOpen(false)}
                        >
                          <div className="flex items-center gap-2 font-semibold">
                            {!isSpecial && <span className="mr-1">{displayIdx}.</span>}
                            <span className="min-w-0 truncate">{safeLocale === 'ar' ? lesson.title_ar : lesson.title_en}</span>
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
          {dashboardLink && (
            <Link
              href={dashboardLink.href}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/30 px-3 text-sm font-medium text-white transition hover:bg-white/10"
              aria-label={dashboardLink.ariaLabel}
              title={dashboardLink.ariaLabel}
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
