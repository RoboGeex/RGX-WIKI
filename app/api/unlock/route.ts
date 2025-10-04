import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getWikiByDomain } from '@/lib/data'

export async function POST(request: NextRequest) {
  const { code } = await request.json()
  const hostname = request.headers.get('host') || ''
  const wiki = getWikiByDomain(hostname)

  if (!wiki) {
    return NextResponse.json({ error: 'No wiki found for this domain' }, { status: 400 })
  }

  if (wiki.accessCode === code) {
    const response = NextResponse.json({ success: true })
    response.cookies.set(`wiki-${wiki.slug}-unlocked`, 'true', { path: '/', maxAge: 60 * 60 * 24 * 365 })
    return response
  }

  return NextResponse.json({ error: 'Invalid access code' }, { status: 401 })
}
