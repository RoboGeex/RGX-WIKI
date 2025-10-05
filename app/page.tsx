import { redirect } from 'next/navigation'
import { getWikiByDomain, getKits } from '@/lib/data'
import { headers } from 'next/headers'
import Link from 'next/link'

// This is the root page of the application. 
// It checks for a custom domain and displays the corresponding wiki.
// If no custom domain is found, it shows a default landing page.
export default function RootPage() {
  const host = headers().get('host')
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

  // The code below would show a list of all available kits,
  // but the current requirement is to redirect to a specific kit.
  /*
  const kits = getKits()
  
  return (
    <div className="min-h-screen bg-[#eef2f1] flex items-center justify-center px-6">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Welcome to RGX Wiki</h1>
        <p className="text-lg text-gray-600 mb-8">Choose a learning kit to get started:</p>
        <div className="grid gap-4 md:grid-cols-2">
          {kits.map(kit => (
            <Link 
              key={kit.slug}
              href={`/en/${kit.slug}`}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-2">{kit.title_en}</h2>
              <p className="text-gray-600">{kit.overview_en}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
  */
}
