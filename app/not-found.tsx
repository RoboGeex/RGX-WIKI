import Link from 'next/link'
import { Home } from 'lucide-react'
import { headers } from 'next/headers'
import { isHubHost, normalizeHost } from '@/lib/domains'

const SUPPORTED_LOCALES = new Set(['en', 'ar'])

function extractWikiSlugFromSegments(segments: string[]): string | undefined {
  if (segments.length === 0) return undefined

  // Hub style: /wiki/locale/...
  if (!SUPPORTED_LOCALES.has(segments[0] || '') && SUPPORTED_LOCALES.has(segments[1] || '')) {
    return segments[0]
  }

  // Internal style: /locale/wiki/...
  if (SUPPORTED_LOCALES.has(segments[0] || '') && segments[1]) {
    return segments[1]
  }

  // Single segment could be wiki root.
  if (!SUPPORTED_LOCALES.has(segments[0] || '')) {
    return segments[0]
  }

  return undefined
}

function getBackHrefFromRequest(): string {
  const host = normalizeHost(headers().get('host'))
  const currentPath = headers().get('x-current-path') || '/'
  const pathOnly = currentPath.split('?')[0]
  const segments = pathOnly.split('/').filter(Boolean)

  const isHubDomain = isHubHost(host)

  // Dedicated domains should go back to the locale root (same wiki by host).
  if (!isHubDomain) {
    return '/'
  }

  // On hub, always return to canonical wiki root so middleware resolves default lesson.
  const wikiSlug = extractWikiSlugFromSegments(segments)
  if (wikiSlug) {
    return `/${wikiSlug}`
  }

  return '/wikis'
}

export default function NotFound() {
  const backHref = getBackHrefFromRequest()

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="glass rounded-2xl p-10 max-w-md w-full text-center space-y-6">
        <div>
          <div className="text-6xl font-extrabold text-primary">
            404
          </div>
          <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            The page you are looking for does not exist or was moved.
          </p>
        </div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 bg-primary hover:opacity-90 text-primary-foreground font-medium py-2.5 px-5 rounded-xl transition-colors"
        >
          <Home size={16} />
          <span>Back to kit</span>
        </Link>
      </div>
    </div>
  )
}
