import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getWiki } from '@/lib/data'
import { getWikisFromDb } from '@/lib/server-data'
import { getPrisma } from '@/lib/prisma-multi'
import accessCodesData from '@/data/access-codes.json'
import { markDbFailure, markDbSuccess, shouldBypassDb, withDbTimeout } from '@/lib/db-fallback'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

function getConfiguredCodes(wikiSlug: string): string[] {
  const raw = (accessCodesData as Record<string, unknown>)[wikiSlug]
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
}

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

  let wiki: any = getWiki(rawKitSlug)
  if (!wiki) {
    const dbWiki = (await getWikisFromDb()).find((w) => w.slug === rawKitSlug)
    if (dbWiki) wiki = dbWiki
  }
  // Note: never log the raw access code — it is a credential.
  console.log(`[Unlock] Attempting unlock. Input Kit: "${rawKitSlug}", Found Wiki Slug: "${wiki?.slug}"`)

  if (!wiki) {
    return NextResponse.json({ error: 'No wiki found for this slug' }, { status: 400 })
  }

  const configuredCodes = getConfiguredCodes(wiki.slug)
  let isValid = configuredCodes.includes(rawCode)

  if (process.env.USE_DB === 'true' && !shouldBypassDb(wiki.slug)) {
    try {
      const db = getPrisma(wiki.slug)
      const matchedCode = await withDbTimeout(() =>
        db.accessCode.findFirst({
          where: {
            code: rawCode,
            wikiSlug: wiki.slug,
          },
        })
      )
      isValid = isValid || Boolean(matchedCode)
      markDbSuccess(wiki.slug)
    } catch (error) {
      markDbFailure(wiki.slug)
      // Keep static fallback validation active if DB access codes are unavailable.
      console.error(`[Unlock API] DB validation error for wiki ${wiki.slug}:`, error)
    }
  }

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid access code for this wiki' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })

  response.cookies.set(`wiki-${wiki.slug}-unlocked`, '', {
    path: '/',
    maxAge: 0,
  })

  response.cookies.set(`wiki-${wiki.slug}-access`, process.env.USE_DB === 'true' ? rawCode : 'true', {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: false,
    sameSite: 'lax',
  })

  return response
}
