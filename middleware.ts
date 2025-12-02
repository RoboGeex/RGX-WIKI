import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import wikisData from '@/data/wikis.json'

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

const HUB_DOMAIN = 'wiki.robogeex.com'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const host = hostname.split(':')[0].toLowerCase()
  const { pathname } = request.nextUrl

  if ((pathname.startsWith('/editor') || pathname.startsWith('/dashboard')) && host !== 'admin.robogeex.com') {
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
      url.pathname = '/wikis'
      return NextResponse.rewrite(url)
    }

    const locale = localeSegment || wiki.defaultLocale || 'en'
    if (rest.length === 0) {
      url.pathname = `/${locale}/${slug}`
      return NextResponse.rewrite(url)
    }

    const pathLocale = rest[0]
    if (!localeSegment && (pathLocale === 'en' || pathLocale === 'ar')) {
      const remainder = rest.slice(1).join('/')
      if (remainder) {
        url.pathname = `/${pathLocale}/${slug}/${remainder}`
      } else {
        url.pathname = `/${pathLocale}/${slug}`
      }
      return NextResponse.rewrite(url)
    }

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
