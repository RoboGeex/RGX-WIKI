"use client"

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getCatalogMessages, type CatalogLocale } from '@/lib/catalog-i18n'

/**
 * Ported from robogeex_courses' Header.tsx.
 *
 * Two deliberate adaptations:
 *  - locale is a URL param (?lang=ar) rather than localStorage, because this
 *    page is server-rendered per request; the EN/العربية buttons are links.
 *  - the "Courses" nav item points at this catalog (the hub root).
 */
type NavItem = {
  href: string
  key: 'home' | 'events' | 'courses' | 'shop' | 'blog' | 'about' | 'contact'
  external?: boolean
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function CatalogHeader({
  locale,
  basePath,
  query,
  onQueryChange,
}: {
  locale: CatalogLocale
  basePath: string
  query: string
  onQueryChange: (next: string) => void
}) {
  const t = getCatalogMessages(locale)
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const NAV: NavItem[] = [
    { href: 'https://www.robogeex.com', key: 'home', external: true },
    { href: 'https://www.robogeex.com/events', key: 'events', external: true },
    { href: basePath, key: 'courses' },
    { href: 'https://www.robogeex.com/shop', key: 'shop', external: true },
    { href: 'https://www.robogeex.com/blog', key: 'blog', external: true },
    { href: 'https://www.robogeex.com/about', key: 'about', external: true },
    { href: 'https://www.robogeex.com/contact', key: 'contact', external: true },
  ]

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    if (searchOpen) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen])

  const langHref = (l: CatalogLocale) =>
    `${basePath}${basePath.includes('?') ? '&' : '?'}lang=${l}`

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_2px_8px_-2px_rgba(31,31,31,0.08),0_1px_0_rgba(31,31,31,0.06)]">
      <div className="flex h-16 items-stretch">
        <Link
          href={basePath}
          aria-label={t.nav.home_aria}
          className="flex shrink-0 items-center justify-center bg-brand px-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logos/logo-horizontal-light.svg" alt="RoboGeex Academy" className="h-10 w-auto" />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end px-4 sm:px-5 lg:justify-between lg:pe-8 lg:ps-8">
          <nav className="hidden min-w-0 items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = item.key === 'courses'
              return (
                <a
                  key={item.key}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className={cx(
                    'relative rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                    active ? 'text-brand' : 'text-ink hover:text-brand',
                  )}
                >
                  {t.nav[item.key]}
                  {active && <span aria-hidden className="absolute -bottom-[1px] end-3 start-3 h-[3px] rounded-full bg-brand" />}
                </a>
              )
            })}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { setSearchOpen((v) => !v); setOpen(false) }}
              aria-label={searchOpen ? t.nav.closeSearch : t.nav.openSearch}
              aria-expanded={searchOpen}
              className={cx(
                'rounded-md p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
                searchOpen ? 'bg-brand/10 text-brand' : 'text-ink hover:bg-ink/5 hover:text-brand',
              )}
            >
              <SearchIcon />
            </button>

            <div className="hidden items-center lg:flex" role="group" aria-label={t.nav.language}>
              <Link
                href={langHref('en')}
                aria-current={locale === 'en' ? 'true' : undefined}
                className={cx('rounded-md px-3 py-2 text-sm transition', locale === 'en' ? 'font-semibold text-ink' : 'text-ink-muted hover:text-ink')}
              >
                EN
              </Link>
              <span aria-hidden className="text-ink/20">|</span>
              <Link
                href={langHref('ar')}
                lang="ar"
                aria-current={locale === 'ar' ? 'true' : undefined}
                className={cx('rounded-md px-3 py-2 text-sm transition', locale === 'ar' ? 'font-semibold text-ink' : 'text-ink-muted hover:text-ink')}
              >
                العربية
              </Link>
            </div>

            <button
              type="button"
              aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
              aria-expanded={open}
              className={cx('rounded-md p-2 transition lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40', open ? 'bg-brand/10 text-brand' : 'text-ink hover:bg-ink/5')}
              onClick={() => { setOpen((v) => !v); setSearchOpen(false) }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expandable search bar */}
      <div className={cx('overflow-hidden border-ink/5 transition-[max-height,border] duration-200 ease-out', searchOpen ? 'max-h-24 border-t' : 'max-h-0 border-t-0')}>
        <form onSubmit={(e) => { e.preventDefault(); setSearchOpen(false) }} className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <div className="relative flex-1">
            <span className="absolute start-3 top-1/2 -translate-y-1/2 text-ink-muted"><SearchIcon /></span>
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t.nav.searchPlaceholder}
              aria-label={t.nav.openSearch}
              className="w-full rounded-xl border border-ink/15 bg-white py-2.5 pe-3 ps-10 text-sm text-ink outline-none focus:border-brand/60"
            />
          </div>
          <button type="button" onClick={() => setSearchOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-ink-muted transition hover:text-ink" aria-label={t.nav.closeSearch}>
            {t.nav.cancel}
          </button>
        </form>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-ink/5 bg-white lg:hidden">
          <div className="px-4 py-3">
            <ul className="space-y-1">
              {NAV.map((item) => {
                const active = item.key === 'courses'
                return (
                  <li key={item.key}>
                    <a
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      className={cx('block rounded-md px-3 py-2 text-sm font-medium', active ? 'bg-brand/10 text-brand' : 'text-ink hover:bg-ink/5')}
                      onClick={() => setOpen(false)}
                    >
                      {t.nav[item.key]}
                    </a>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 flex items-center gap-2 border-t border-ink/5 pt-3" role="group" aria-label={t.nav.language}>
              <Link href={langHref('en')} className={cx('flex-1 rounded-md border px-3 py-2 text-center text-sm', locale === 'en' ? 'border-brand font-semibold text-brand' : 'border-ink/10 text-ink-muted')}>EN</Link>
              <Link href={langHref('ar')} lang="ar" className={cx('flex-1 rounded-md border px-3 py-2 text-center text-sm', locale === 'ar' ? 'border-brand font-semibold text-brand' : 'border-ink/10 text-ink-muted')}>العربية</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
