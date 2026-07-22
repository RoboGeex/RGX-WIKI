import { Lexend, Manrope, Cairo } from 'next/font/google'
import { getCatalogEntries } from '@/lib/catalog'
import type { CatalogLocale } from '@/lib/catalog-i18n'
import { CatalogShell } from '@/components/catalog/CatalogShell'
import { CatalogFooter } from '@/components/catalog/CatalogFooter'

/**
 * The public course catalog, rendered at BOTH the hub root (/) and /wikis,
 * laid out to match courses.robogeex.com.
 *
 * Kept as a component rather than a page so app/page.tsx can use it while
 * preserving its custom-domain branching (a dedicated wiki domain must still
 * redirect into that wiki, not render the catalog).
 */

// Fonts are applied through the .rgx-catalog scope in globals.css — the global
// `Inter !important` rules would otherwise silently win over these classNames.
const displayFont = Lexend({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--cat-display' })
const bodyFont = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--cat-body' })
const arabicFont = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '600', '700'], variable: '--font-cat-cairo' })

type CatalogPageProps = {
  locale?: CatalogLocale
  initialQuery?: string
  /** Where nav/language links point — differs between / and /wikis. */
  basePath?: string
}

export default async function CatalogPage({
  locale = 'en',
  initialQuery = '',
  basePath = '/wikis',
}: CatalogPageProps) {
  const entries = await getCatalogEntries()

  return (
    <div
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`rgx-catalog ${displayFont.variable} ${bodyFont.variable} ${arabicFont.variable} flex min-h-screen flex-col bg-white`}
    >
      <CatalogShell entries={entries} locale={locale} basePath={basePath} initialQuery={initialQuery} />
      <CatalogFooter locale={locale} basePath={basePath} />
    </div>
  )
}
