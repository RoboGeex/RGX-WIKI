import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const hostname = request.headers.get('host') || ''
  
  // Extract subdomain from hostname (remove port if present)
  const hostnameWithoutPort = hostname.split(':')[0]
  const subdomain = hostnameWithoutPort.split('.')[0]
  
  // Skip if it's localhost, www, or already has a locale
  if (subdomain === 'localhost' || subdomain === 'www' || subdomain === '127' || subdomain === '0') {
    return NextResponse.next()
  }
  
  // Skip Vercel deployment URLs (they contain generated IDs)
  if (hostname.includes('.vercel.app') || subdomain.includes('-')) {
    // For Vercel deployments, don't use subdomain routing
    return NextResponse.next()
  }
  
  // Skip if it's already a locale-based route
  if (url.pathname.startsWith('/en/') || url.pathname.startsWith('/ar/')) {
    return NextResponse.next()
  }
  
  // Redirect subdomain to locale-based route
  // e.g., osama-kanan.localhost -> localhost/en/osama-kanan
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const newUrl = new URL(`/en/${subdomain}`, baseUrl)
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

