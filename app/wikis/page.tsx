import Link from 'next/link'
import { Lexend, Manrope, Cairo } from 'next/font/google'
import type { CSSProperties } from 'react'
import { getCatalogEntries } from '@/lib/catalog'
import { CatalogBrowser } from '@/components/catalog/CatalogBrowser'

export const dynamic = 'force-dynamic'

// Fonts are applied through the .rgx-catalog scope in globals.css — the global
// `Inter !important` rules would otherwise silently win over these classNames.
const displayFont = Lexend({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--cat-display' })
const bodyFont = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--cat-body' })
const arabicFont = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '600', '700'], variable: '--font-cat-cairo' })

// Accreditations / partnerships shown under the hero.
const PARTNERS = [
  { src: '/images/partners/arduino-education.png', alt: 'Arduino Education Partner' },
  { src: '/images/partners/printlab.png', alt: 'PrintLab' },
  { src: '/images/partners/first-global.png', alt: 'FIRST Global' },
  { src: '/images/partners/autodesk-atc.png', alt: 'Autodesk Authorized Training Center' },
  { src: '/images/partners/stem-accredited.png', alt: 'STEM.org Accredited Educational Program' },
  { src: '/images/partners/best-in-stem.png', alt: 'Best in STEM' },
]

const COPY = {
  en: {
    title: 'Learn robotics, one lesson at a time.',
    subtitle: 'Interactive learning wikis for RoboGeex kits — real code, real hardware.',
    sub2: 'Step-by-step lessons in English and Arabic, built by educators.',
    partnership: 'In partnership with',
    cta: 'Browse the wikis',
    heading: 'All Wikis',
    kicker: 'Curated Collection',
    other: 'العربية',
  },
  ar: {
    title: 'تعلّم الروبوتيات، درساً بعد درس.',
    subtitle: 'ويكي تعليمية تفاعلية لأطقم RoboGeex — برمجة حقيقية وأجهزة حقيقية.',
    sub2: 'دروس خطوة بخطوة بالعربية والإنجليزية، من إعداد المعلمين.',
    partnership: 'بالشراكة مع',
    cta: 'تصفّح الويكي',
    heading: 'كل الويكي',
    kicker: 'مجموعة مختارة',
    other: 'English',
  },
} as const

type PageProps = { searchParams?: { q?: string; lang?: string } }

export default async function WikisPage({ searchParams }: PageProps) {
  const locale: 'en' | 'ar' = searchParams?.lang === 'ar' ? 'ar' : 'en'
  const t = COPY[locale]
  const entries = await getCatalogEntries()
  const initialQuery = (searchParams?.q || '').trim()

  const fontVars = {
    '--cat-display': locale === 'ar' ? 'var(--font-cat-cairo)' : undefined,
  } as CSSProperties

  return (
    <div
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`rgx-catalog ${displayFont.variable} ${bodyFont.variable} ${arabicFont.variable} flex min-h-screen flex-col bg-white`}
      style={fontVars}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logos/logo-horizontal-light.svg" alt="RoboGeex" className="h-9 w-auto" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/wikis" className="text-sm font-bold text-brand-600">
              {locale === 'ar' ? 'الويكي' : 'Wikis'}
            </Link>
            <Link
              href={`/wikis?lang=${locale === 'ar' ? 'en' : 'ar'}`}
              className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-bold text-ink-soft transition hover:border-brand/50 hover:text-ink"
            >
              {t.other}
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-600"
            >
              {locale === 'ar' ? 'دخول' : 'Log in'}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-ink/5 bg-ink/[0.03]">
        <div className="grid min-h-[420px] items-stretch lg:grid-cols-[5fr_7fr]">
          <div className="flex items-center px-6 pb-12 pt-8 sm:px-10 lg:pb-14 lg:pe-10 lg:ps-16 lg:pt-10">
            <div className="w-full max-w-xl">
              <h1 className="cat-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink lg:text-5xl">
                {t.title}
              </h1>
              <p className="mt-5 text-lg text-ink-soft">{t.subtitle}</p>
              <p className="mt-3 text-base text-ink-muted">{t.sub2}</p>

              <div className="mt-8">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted/70">
                  {t.partnership}
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  {PARTNERS.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.src}
                      src={p.src}
                      alt={p.alt}
                      title={p.alt}
                      loading="lazy"
                      className="h-10 w-auto object-contain opacity-80 transition hover:opacity-100 sm:h-12"
                    />
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <a
                  href="#wikis"
                  className="inline-flex rounded-full bg-brand px-7 py-3 text-base font-bold text-white transition hover:bg-brand-600"
                >
                  {t.cta}
                </a>
              </div>
            </div>
          </div>

          <div className="relative min-h-[260px] lg:min-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        </div>
      </section>

      {/* Catalog */}
      <main id="wikis" className="mx-auto w-full max-w-7xl flex-1 scroll-mt-24 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <h2 className="cat-display text-3xl font-extrabold text-ink sm:text-4xl">{t.heading}</h2>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink-muted">{t.kicker}</p>
        </div>

        <CatalogBrowser entries={entries} locale={locale} initialQuery={initialQuery} />
      </main>

      {/* Footer */}
      <footer className="mt-12 bg-ink px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logos/wordmark-dark.svg" alt="RoboGeex" className="h-7 w-auto" />
            <p className="mt-2 text-xs text-white/60">
              © {new Date().getFullYear()} RoboGeex Academy
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs font-bold uppercase tracking-[0.15em] text-white/70">
            <Link href="/wikis" className="transition hover:text-white">{locale === 'ar' ? 'الويكي' : 'Wikis'}</Link>
            <Link href="/login" className="transition hover:text-white">{locale === 'ar' ? 'دخول' : 'Log in'}</Link>
            <a href="mailto:info@robogeex.com" className="transition hover:text-white">info@robogeex.com</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
