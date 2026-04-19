import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getWiki } from '@/lib/data'
import { getPrisma } from '@/lib/prisma-multi'
import accessCodesData from '@/data/access-codes.json'
import { markDbFailure, markDbSuccess, shouldBypassDb, withDbTimeout } from '@/lib/db-fallback'
import { isDbOnlyMode } from '@/lib/runtime-flags'

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

  const wiki = getWiki(rawKitSlug)

  if (!wiki) {
    return NextResponse.json({ error: 'No wiki found for this slug' }, { status: 400 })
  }

  const configuredCodes = getConfiguredCodes(wiki.slug)
  const dbOnlyMode = isDbOnlyMode()
  let isValid = configuredCodes.includes(rawCode)

  if (process.env.USE_DB === 'true') {
    if (shouldBypassDb(wiki.slug)) {
      if (configuredCodes.length > 0) {
        // DB circuit breaker active: allow static code fallback for continuity.
        isValid = isValid || configuredCodes.includes(rawCode)
      } else if (dbOnlyMode) {
        return NextResponse.json(
          { error: `DB-only mode: database is temporarily bypassed for wiki "${wiki.slug}".` },
          { status: 503 }
        )
      }
    } else {
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
        if (configuredCodes.length > 0) {
          // If DB validation fails, fallback to static codes when available.
          isValid = isValid || configuredCodes.includes(rawCode)
        } else if (dbOnlyMode) {
          return NextResponse.json(
            { error: `DB-only mode: access-code validation failed for wiki "${wiki.slug}".` },
            { status: 503 }
          )
        } else {
          // Keep static fallback validation active if DB access codes are unavailable.
          console.error(`[Unlock API] DB validation error for wiki ${wiki.slug}:`, error)
        }
      }
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
