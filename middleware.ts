import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getWikiByDomain } from '@/lib/data'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  const wiki = getWikiByDomain(hostname)

  // If the wiki is locked and the user is not trying to unlock it, redirect to the unlock page
  if (wiki && wiki.isLocked && !url.pathname.startsWith('/unlock')) {
    const hasAccess = request.cookies.get(`wiki-${wiki.slug}-unlocked`)
    if (!hasAccess) {
      url.pathname = '/unlock'
      return NextResponse.redirect(url)
    }
  }

  // Skip Vercel deployment URLs completely
  if (hostname.includes('.vercel.app')) {
    return NextResponse.next()
  }

  // Extract subdomain from hostname (remove port if present)
  const hostnameWithoutPort = hostname.split(':')[0]
  const subdomain = hostnameWithoutPort.split('.')[0]

  // Skip if it's a root domain or a common subdomain that shouldn't be a kit
  if (subdomain === 'localhost' || subdomain === 'www' || subdomain === '127' || subdomain === '0' || subdomain === 'robogeex') {
    return NextResponse.next()
  }

  // If the user is trying to unlock the wiki, do not redirect them.
  if (url.pathname.startsWith('/unlock')) {
    return NextResponse.next();
  }

  // Skip if the path already includes a language locale
  if (url.pathname.startsWith('/en/') || url.pathname.startsWith('/ar/')) {
    return NextResponse.next()
  }
  
  // Construct the target path based on the subdomain
  const targetPath = `/en/${subdomain}`

  // If the current path is already the target path, do not redirect.
  if (url.pathname === targetPath) {
    return NextResponse.next();
  }

  // Otherwise, perform the redirect to the locale-based route.
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const newUrl = new URL(targetPath, baseUrl)
  return NextResponse.redirect(newUrl)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
