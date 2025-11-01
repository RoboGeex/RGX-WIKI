import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getWiki } from '@/lib/data'
import { prisma } from '@/lib/prisma'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export async function POST(request: NextRequest) {
  const payload = await request.json()
  const rawCode = typeof payload?.code === 'string' ? payload.code.trim() : ''
  const rawKitSlug = typeof payload?.kitSlug === 'string' ? payload.kitSlug.trim() : ''

  if (!rawKitSlug) {
    return NextResponse.json({ error: 'Missing kitSlug' }, { status: 400 })
  }

  if (!rawCode) {
    return NextResponse.json({ error: 'Missing access code' }, { status: 400 })
  }

  const wiki = getWiki(rawKitSlug)

  if (!wiki) {
    return NextResponse.json({ error: 'No wiki found for this slug' }, { status: 400 })
  }

  if (process.env.USE_DB === 'true') {
    const matchedCode = await prisma.accessCode.findFirst({
      where: {
        code: rawCode,
        wikiSlug: wiki.slug,
      },
    })

    if (!matchedCode) {
      return NextResponse.json({ error: 'Invalid access code for this wiki' }, { status: 401 })
    }
  }

  const response = NextResponse.json({ success: true })

  response.cookies.set(`wiki-${wiki.slug}-unlocked`, '', {
    path: '/',
    maxAge: 0,
  })

  response.cookies.set(`wiki-${wiki.slug}-access`, 'true', {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: false,
    sameSite: 'lax',
  })

  return response
}
