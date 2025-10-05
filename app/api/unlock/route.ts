import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getWikiFromKit } from '@/lib/data'

export async function POST(request: NextRequest) {
  const { code, kitSlug } = await request.json()

  if (!kitSlug) {
    return NextResponse.json({ error: 'Missing kitSlug' }, { status: 400 });
  }

  const wiki = getWikiFromKit(kitSlug)

  if (!wiki) {
    return NextResponse.json({ error: 'No wiki found for this kit' }, { status: 400 })
  }

  if (wiki.accessCode === code) {
    const response = NextResponse.json({ success: true })
    response.cookies.set(`wiki-${wiki.slug}-unlocked`, 'true', { path: '/', maxAge: 60 * 60 * 24 * 365 })
    return response
  }

  return NextResponse.json({ error: 'Invalid access code' }, { status: 401 })
}
