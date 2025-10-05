import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getWikiByDomain } from '@/lib/data'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const host = hostname.split(':')[0].toLowerCase()
  const { pathname } = request.nextUrl

  // Redirect /editor and /dashboard on non-admin domains to admin.robogeex.com
  if ((pathname.startsWith('/editor') || pathname.startsWith('/dashboard')) && host !== 'admin.robogeex.com') {
    const adminUrl = new URL(pathname, 'https://admin.robogeex.com')
    return NextResponse.redirect(adminUrl)
  }

  // Handle Vercel deployment URL
  if (host.endsWith('.vercel.app')) {
    return NextResponse.redirect('https://ziggy.robogeex.com')
  }

  // Handle root domain
  if (host === 'robogeex.com' || host === 'www.robogeex.com') {
    return NextResponse.redirect('https://ziggy.robogeex.com')
  }

  // Handle admin subdomain
  if (host === 'admin.robogeex.com') {
    const passthroughPaths = ['/api', '/_next', '/favicon.ico', '/images', '/uploads'];
    if (passthroughPaths.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // If the path already starts with /editor, do nothing.
    if (pathname.startsWith('/editor')) {
      return NextResponse.next();
    }

    // Redirect the root to /editor
    if (pathname === '/') {
      url.pathname = '/editor';
      return NextResponse.redirect(url);
    }
    
    // Rewrite other paths to be under /editor
    url.pathname = `/editor${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Handle wiki subdomains
  const wiki = getWikiByDomain(host)
  if (wiki) {
    const locale = wiki.defaultLocale || 'en'
    const kitSlug = wiki.slug

    // Passthrough for API routes and static assets
    const passthroughPaths = ['/api', '/_next', '/favicon.ico', '/images', '/uploads'];
    if (passthroughPaths.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }
    
    // Handle /unlock page specifically
    if (pathname.endsWith('/unlock')) {
      const pathLocale = pathname.split('/')[1];
      if (pathLocale === 'en' || pathLocale === 'ar') {
        url.pathname = `/${pathLocale}/unlock`;
        return NextResponse.rewrite(url);
      } else {
         // Redirect to locale-prefixed unlock URL
         url.pathname = `/${locale}/unlock`;
         return NextResponse.redirect(url);
      }
    }

    // Rewrite root of wiki to kit page
    if (pathname === '/') {
      url.pathname = `/${locale}/${kitSlug}`
      return NextResponse.rewrite(url)
    }

    const pathSegments = pathname.split('/').filter(Boolean);
    const pathLocale = pathSegments[0];
    
    // Handle locale-prefixed paths like /en/getting-started
    if (pathLocale === 'en' || pathLocale === 'ar') {
        const slug = pathSegments.slice(1).join('/');
        if (slug) {
            // This is a lesson path like /en/getting-started. Rewrite to the internal lesson path.
             url.pathname = `/${pathLocale}/${kitSlug}/lesson/${slug}`;
             return NextResponse.rewrite(url);
        } else if (pathSegments.length === 1) {
            // This is just /en or /ar, so go to the kit page
            url.pathname = `/${pathLocale}/${kitSlug}`;
            return NextResponse.rewrite(url);
        }
    }
    
    // Redirect non-locale paths (e.g. /getting-started) to locale-prefixed paths
    if (pathSegments.length > 0 && pathSegments[0] !== 'en' && pathSegments[0] !== 'ar') {
        const newUrl = new URL(`/${locale}${pathname}`, request.url)
        return NextResponse.redirect(newUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
      * Match all request paths except for the ones starting with:
      * - _next/static (static files)
      * - _next/image (image optimization files)
      */
    '/((?!_next/static|_next/image).*)',
  ],
}
