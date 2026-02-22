import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import wikisData from '@/data/wikis.json'
import { HUB_DOMAIN, normalizeHost } from '@/lib/domains'

function getWikiBySlug(slug?: string | null) {
  if (!slug) return undefined
  const trimmed = slug.trim()
  if (!trimmed) return undefined
  return (wikisData as any[]).find((w) => w.slug === trimmed)
}

const legacyDomainMap: Record<string, string> = {
  'ziggy.robogeex.com': 'ziggy',
  'clicky2.robogeex.com': 'clicky'
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const host = normalizeHost(hostname)
  const { pathname } = request.nextUrl
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
    // If they hit the root of the legacy domain, redirect to the hub's kit root / slug
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
      return NextResponse.next()
    }
    if (pathname.startsWith('/editor')) {
      return NextResponse.next()
    }
    if (pathname === '/') {
      url.pathname = '/editor'
      return NextResponse.redirect(url)
    }
    url.pathname = `/editor${pathname}`
    return NextResponse.rewrite(url)
  }

  if (host === HUB_DOMAIN) {
    const passthroughPaths = ['/api', '/_next', '/favicon.ico', '/images', '/uploads']
    if (passthroughPaths.some((p) => pathname.startsWith(p))) {
      return NextResponse.next()
    }

    const segments = pathname.split('/').filter(Boolean)

    const firstSegment = segments[0]
    const secondSegment = segments[1]
    const isLocale = firstSegment === 'en' || firstSegment === 'ar'
    if (isLocale && secondSegment === 'unlock') {
      return NextResponse.next()
    }

    if (segments.length === 0) {
      url.pathname = '/wikis'
      return NextResponse.rewrite(url)
    }

    let localeSegment: string | undefined
    let slug = segments[0]
    let rest = segments.slice(1)
    let wiki = getWikiBySlug(slug)

    if (!wiki && (slug === 'en' || slug === 'ar') && rest.length > 0) {
      localeSegment = slug
      slug = rest[0]
      rest = rest.slice(1)
      wiki = getWikiBySlug(slug)
    }

    if (!wiki) {
      if (localeSegment) {
        return NextResponse.next()
      }
      url.pathname = '/wikis'
      return NextResponse.rewrite(url)
    }

    const defaultLocale = wiki.defaultLocale || 'en'
    const defaultLesson = wiki.defaultLessonSlug || 'getting-started'
    const isLocaleSegment = localeSegment === 'en' || localeSegment === 'ar'

    if (!localeSegment) {
      if (rest.length === 0) {
        url.pathname = `/${slug}/${defaultLocale}/${defaultLesson}`
        return NextResponse.redirect(url)
      }

      const potentialLocale = rest[0]
      if (potentialLocale === 'en' || potentialLocale === 'ar') {
        const remainderSegments = rest.slice(1)
        if (remainderSegments.length === 0) {
          url.pathname = `/${slug}/${potentialLocale}/${defaultLesson}`
          return NextResponse.redirect(url)
        }
        const firstRemainder = remainderSegments[0]
        if (firstRemainder === 'resources') {
          url.pathname = `/${potentialLocale}/${slug}/resources`
          return NextResponse.rewrite(url)
        }
        const lessonPath =
          firstRemainder === 'lesson' ? remainderSegments.slice(1).join('/') : remainderSegments.join('/')
        url.pathname = `/${potentialLocale}/${slug}/lesson/${lessonPath || defaultLesson}`
        return NextResponse.rewrite(url)
      }

      const normalizedRemainder = rest.join('/')
      url.pathname = `/${slug}/${defaultLocale}/${normalizedRemainder || defaultLesson}`
      return NextResponse.redirect(url)
    }

    if (isLocaleSegment) {
      const safeLocale = localeSegment
      if (rest.length === 0) {
        url.pathname = `/${slug}/${safeLocale}/${defaultLesson}`
        return NextResponse.redirect(url)
      }
      const firstSegment = rest[0]
      if (firstSegment === 'lesson') {
        const lessonPath = rest.slice(1).join('/') || defaultLesson
        url.pathname = `/${slug}/${safeLocale}/${lessonPath}`
        return NextResponse.redirect(url)
      }
      if (firstSegment === 'resources') {
        url.pathname = `/${slug}/${safeLocale}/resources`
        return NextResponse.redirect(url)
      }
      url.pathname = `/${slug}/${safeLocale}/${rest.join('/')}`
      return NextResponse.redirect(url)
    }

    const locale = defaultLocale
    url.pathname = `/${locale}/${slug}/${rest.join('/')}`
    return NextResponse.rewrite(url)
  }

  // Any unhandled requests hit next()
  return NextResponse.next()

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
