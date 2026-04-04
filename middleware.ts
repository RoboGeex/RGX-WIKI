import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import wikisData from '@/data/wikis.json'
import { HUB_DOMAIN, normalizeHost } from '@/lib/domains'

function getWikiBySlug(slug?: string | null) {
  if (!slug) return undefined
  const trimmed = slug.trim().replace(/_/g, '-')
  if (!trimmed) return undefined
  return (wikisData as any[]).find((w) => w.slug === trimmed)
}

const legacyDomainMap: Record<string, string> = {
  'ziggy.robogeex.com': 'ziggy',
  'clicky2.robogeex.com': 'clicky'
}

export function middleware(request: NextRequest) {
  const hostHeader = request.headers.get('host')
  const { pathname } = request.nextUrl
  console.log(`[Middleware] ${hostHeader} -> ${pathname}`)

  const currentPath = request.nextUrl.pathname + request.nextUrl.search

  // Inject x-current-path into the request headers so server components
  // can read it via headers().get('x-current-path').
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-current-path', currentPath)

  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const host = normalizeHost(hostname)
  const allowLocalAdmin = host === 'localhost' || host === '127.0.0.1' || host === '::1'

  if ((pathname.startsWith('/editor') || pathname.startsWith('/dashboard')) && host !== 'admin.robogeex.com' && !allowLocalAdmin) {
    const adminUrl = new URL(pathname, 'https://admin.robogeex.com')
    return NextResponse.redirect(adminUrl)
  }

  if (host === 'robogeex.com' || host === 'www.robogeex.com') {
    return NextResponse.redirect(`https://${HUB_DOMAIN}/ziggy`)
  }

  // Redirect legacy subdomains to the central wiki hub
  const legacySlug = legacyDomainMap[host]
  if (legacySlug) {
    const newUrl = new URL(request.url)
    newUrl.host = HUB_DOMAIN
    if (pathname === '/') {
      newUrl.pathname = `/${legacySlug}`
    } else {
      newUrl.pathname = `/${legacySlug}${pathname}`
    }
    return NextResponse.redirect(newUrl)
  }

  if (host === 'admin.robogeex.com') {
    const passthroughPaths = ['/api', '/_next', '/favicon.ico', '/images', '/uploads']
    if (passthroughPaths.some(p => pathname.startsWith(p))) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    if (pathname.startsWith('/editor')) {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    if (pathname === '/') {
      url.pathname = '/editor'
      return NextResponse.redirect(url)
    }
    url.pathname = `/editor${pathname}`
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  const passthroughPaths = ['/api', '/_next', '/favicon.ico', '/images', '/uploads']
  if (passthroughPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const segments = pathname.split('/').filter(Boolean)

  // Resolver: determine which wiki we're talking about
  let wiki: any = undefined
  let wikiSlug: string | undefined = undefined
  let normalizedRest = segments

  if (host === HUB_DOMAIN || host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    if (segments.length === 0 || pathname === '/wikis') {
      return NextResponse.next({ request: { headers: requestHeaders } })
    }
    
    // Check if first segment is a locale
    const firstSegment = segments[0]
    const isLocale = firstSegment === 'en' || firstSegment === 'ar'
    
    if (isLocale) {
      if (segments[1] === 'unlock') return NextResponse.next({ request: { headers: requestHeaders } })
      if (segments.length === 1) { // Just /en or /ar
         url.pathname = '/wikis'
         return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
      }
      wikiSlug = segments[1]
      wiki = getWikiBySlug(wikiSlug)
      normalizedRest = segments.slice(2)
      if (wiki) {
        // Redir /en/ziggy -> /ziggy/en
        url.pathname = `/${wikiSlug}/${firstSegment}${normalizedRest.length > 0 ? '/' + normalizedRest.join('/') : ''}`
        return NextResponse.redirect(url)
      }
    } else {
      wikiSlug = segments[0]
      wiki = getWikiBySlug(wikiSlug)
      normalizedRest = segments.slice(1)
    }
  } else {
    // Dedicated domain or legacy subdomain
    const legacySlug = legacyDomainMap[host]
    if (legacySlug) {
       wikiSlug = legacySlug
       wiki = getWikiBySlug(wikiSlug)
    } else {
       // Search wikis for matching domain
       wiki = (wikisData as any[]).find(w => (w.domains || []).some((d: string) => normalizeHost(d) === host))
       if (wiki) wikiSlug = wiki.slug
    }
  }

  // If no wiki identified, pass through
  if (!wiki) {
    if (segments.length === 0) {
      url.pathname = '/wikis'
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    }
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // We have a wiki! Standardize the internal path to /[locale]/[kit]/lesson/[lesson]
  const defaultLocale = wiki.defaultLocale || 'en'
  const defaultLesson = wiki.defaultLessonSlug || 'getting-started'
  
  // Extract locale from remainder if present
  let currentLocale = defaultLocale
  let finalRest = normalizedRest

  if (normalizedRest[0] === 'en' || normalizedRest[0] === 'ar') {
    currentLocale = normalizedRest[0]
    finalRest = normalizedRest.slice(1)
  }

  // Edge case: if we are at the root of a hub wiki (/ziggy), redirect to /ziggy/en/lesson
  if (normalizedRest.length === 0 && (host === HUB_DOMAIN || host === 'localhost' || host === '127.0.0.1' || host === '::1')) {
     url.pathname = `/${wikiSlug}/${defaultLocale}/${defaultLesson}`
     return NextResponse.redirect(url)
  }

  // Standardize rewrites
  if (finalRest[0] === 'resources') {
    url.pathname = `/${currentLocale}/${wikiSlug}/lesson/resources`
  } else {
    const lessonSlug = finalRest[0] === 'lesson' ? finalRest.slice(1).join('/') : finalRest.join('/')
    url.pathname = `/${currentLocale}/${wikiSlug}/lesson/${lessonSlug || defaultLesson}`
  }

  return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
