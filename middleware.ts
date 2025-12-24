import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import wikisData from '@/data/wikis.json'
import { HUB_DOMAIN, normalizeHost } from '@/lib/domains'

function getWikiByDomain(host?: string | null) {
  const normalised = host?.split(':')[0].toLowerCase()
  if (!normalised) return undefined
  return (wikisData as any[]).find((w) =>
    (w.domains || []).map((d: string) => d.toLowerCase()).includes(normalised)
  )
}

function getWikiBySlug(slug?: string | null) {
  if (!slug) return undefined
  const trimmed = slug.trim()
  if (!trimmed) return undefined
  return (wikisData as any[]).find((w) => w.slug === trimmed)
}

const hasDedicatedDomain = (wiki: any) => Array.isArray(wiki?.domains) && wiki.domains.length > 0

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const host = normalizeHost(hostname)
  const { pathname } = request.nextUrl
  const allowLocalAdmin =
    process.env.LOCAL_ADMIN === '1' && (host === 'localhost' || host === '127.0.0.1')

  if ((pathname.startsWith('/editor') || pathname.startsWith('/dashboard')) && host !== 'admin.robogeex.com' && !allowLocalAdmin) {
    const adminUrl = new URL(pathname, 'https://admin.robogeex.com')
    return NextResponse.redirect(adminUrl)
  }

  if (host === 'robogeex.com' || host === 'www.robogeex.com') {
    return NextResponse.redirect('https://ziggy.robogeex.com')
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

    if (hasDedicatedDomain(wiki)) {
      const targetDomain = wiki.domains[0]
      const locale = localeSegment || wiki.defaultLocale || 'en'
      const remainder = rest.join('/')
      const destinationPath = remainder ? `${locale}/${remainder}` : `${locale}/getting-started`
      return NextResponse.redirect(`https://${targetDomain}/${destinationPath}`)
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

  const wiki = getWikiByDomain(host)
  if (wiki) {
    const locale = wiki.defaultLocale || 'en'
    const kitSlug = wiki.slug

    const passthroughPaths = ['/api', '/_next', '/favicon.ico', '/images', '/uploads']
    if (passthroughPaths.some(p => pathname.startsWith(p))) {
      return NextResponse.next()
    }

    const accessCookie = request.cookies.get(`wiki-${wiki.slug}-access`)
    const unlockLocales = ['en', 'ar']
    const isLocaleUnlock = unlockLocales.some(loc =>
      pathname === `/${loc}/unlock` || pathname.startsWith(`/${loc}/unlock/`)
    )
    const isUnlockPath = pathname === '/unlock' || isLocaleUnlock

    if (!accessCookie && !isUnlockPath) {
      const unlockUrl = new URL(`/${locale}/unlock`, request.url)
      unlockUrl.searchParams.set('kit', kitSlug)
      const redirectTarget = pathname === '/' ? '/' : pathname
      const redirectWithQuery = `${redirectTarget}${request.nextUrl.search || ''}`
      unlockUrl.searchParams.set('redirect', redirectWithQuery || '/')
      return NextResponse.redirect(unlockUrl)
    }

    if (pathname.endsWith('/unlock')) {
      const pathLocale = pathname.split('/')[1]
      if (pathLocale === 'en' || pathLocale === 'ar') {
        url.pathname = `/${pathLocale}/unlock`
        return NextResponse.rewrite(url)
      } else {
        url.pathname = `/${locale}/unlock`
        return NextResponse.redirect(url)
      }
    }

    if (pathname === '/') {
      url.pathname = `/${locale}/${kitSlug}`
      return NextResponse.rewrite(url)
    }

    const pathSegments = pathname.split('/').filter(Boolean)
    const pathLocale = pathSegments[0]

    if (pathLocale === 'en' || pathLocale === 'ar') {
      const slug = pathSegments.slice(1).join('/')
      if (slug) {
        url.pathname = `/${pathLocale}/${kitSlug}/lesson/${slug}`
        return NextResponse.rewrite(url)
      } else if (pathSegments.length === 1) {
        url.pathname = `/${pathLocale}/${kitSlug}`
        return NextResponse.rewrite(url)
      }
    }

    if (pathSegments.length > 0 && pathSegments[0] !== 'en' && pathSegments[0] !== 'ar') {
      const newUrl = new URL(`/${locale}${pathname}`, request.url)
      return NextResponse.redirect(newUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
