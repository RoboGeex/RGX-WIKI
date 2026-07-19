import { redirect } from 'next/navigation'
import { getWikiByDomain, getKits } from '@/lib/data'
import { headers } from 'next/headers'
import { isHubHost, normalizeHost } from '@/lib/domains'
import MarketingLanding from './components/marketing-landing'

// This is the root page of the application.
// It checks for a custom domain and displays the corresponding wiki.
// If no custom domain is found, it shows a default landing page.
export default async function RootPage({
  searchParams,
}: {
  searchParams?: { lang?: string }
}) {
  const host = headers().get('host')
  const normalizedHost = normalizeHost(host)

  // The hub root is the public marketing landing page; the browsable
  // wiki index stays at /wikis. ?lang=ar switches the landing to Arabic.
  if (isHubHost(normalizedHost)) {
    return <MarketingLanding lang={searchParams?.lang === 'ar' ? 'ar' : 'en'} />
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
