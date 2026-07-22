import { redirect } from 'next/navigation'
import { getWikiByDomain, getKits } from '@/lib/data'
import { headers } from 'next/headers'
import { isHubHost, normalizeHost } from '@/lib/domains'
import CatalogPage from '@/components/catalog/CatalogPage'

export const dynamic = 'force-dynamic'

// This is the root page of the application.
// It checks for a custom domain and displays the corresponding wiki.
// If no custom domain is found, it shows the wiki catalog.
export default async function RootPage({
  searchParams,
}: {
  searchParams?: { q?: string; lang?: string }
}) {
  const host = headers().get('host')
  const normalizedHost = normalizeHost(host)

  // The hub root IS the catalog (same page as /wikis). ?lang=ar switches to
  // Arabic. The previous marketing landing lives on in
  // app/components/marketing-landing.tsx if it is ever wanted back.
  //
  // Everything below this branch is untouched: a dedicated wiki domain must
  // still redirect into that wiki rather than render the catalog.
  if (isHubHost(normalizedHost)) {
    return (
      <CatalogPage
        locale={searchParams?.lang === 'ar' ? 'ar' : 'en'}
        initialQuery={(searchParams?.q || '').trim()}
        basePath="/"
      />
    )
  }

  const wiki = getWikiByDomain(host)

  if (wiki) {
    // If a wiki is matched to the domain, we want to show the content
    // of the first kit associated with that wiki.
    const kits = getKits(wiki.slug)
    if (kits.length > 0) {
      // Redirect to the first kit's page.
      // e.g. /en/ziggy
      redirect(`/${wiki.defaultLocale || 'en'}/${kits[0].slug}`)
    }
  }

  // If no wiki is matched (e.g., when accessing via the .vercel.app URL),
  // redirect to the default "ziggy" kit page.
  redirect('/en/ziggy')
}
