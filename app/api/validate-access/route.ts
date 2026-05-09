import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPrisma } from '@/lib/prisma-multi'
import accessCodesData from '@/data/access-codes.json'
import { markDbFailure, markDbSuccess, shouldBypassDb, withDbTimeout } from '@/lib/db-fallback'

function getConfiguredCodes(wikiSlug: string): string[] {
  const raw = (accessCodesData as Record<string, unknown>)[wikiSlug]
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean)
}

export async function GET(request: NextRequest) {
  const kitSlug = request.nextUrl.searchParams.get('kit')?.trim()
  if (!kitSlug) return NextResponse.json({ valid: false })

  const configuredCodes = getConfiguredCodes(kitSlug)
  const cookieValue = request.cookies.get(`wiki-${kitSlug}-access`)?.value?.trim()

  // If no cookie, no access
  if (!cookieValue) {
    // Wiki with no codes configured is public
    if (configuredCodes.length === 0 && process.env.USE_DB !== 'true') {
      return NextResponse.json({ valid: true })
    }
    // When USE_DB is true we still need to check DB below
    if (process.env.USE_DB !== 'true') {
      return NextResponse.json({ valid: false })
    }
  }

  // Static-only mode
  if (process.env.USE_DB !== 'true') {
    if (configuredCodes.length === 0) return NextResponse.json({ valid: true })
    return NextResponse.json({ valid: Boolean(cookieValue && configuredCodes.includes(cookieValue)) })
  }

  // Static code match — still valid
  if (cookieValue && configuredCodes.includes(cookieValue)) {
    return NextResponse.json({ valid: true })
  }

  // DB validation
  if (!shouldBypassDb(kitSlug)) {
    try {
      const db = getPrisma(kitSlug)
      const codesCount = await withDbTimeout(() =>
        db.accessCode.count({ where: { wikiSlug: kitSlug } })
      )

      if (codesCount === 0 && configuredCodes.length === 0) {
        // No access codes configured anywhere — wiki is public
        markDbSuccess(kitSlug)
        return NextResponse.json({ valid: true })
      }

      if (codesCount > 0) {
        const matched = cookieValue
          ? await withDbTimeout(() =>
              db.accessCode.findFirst({ where: { code: cookieValue, wikiSlug: kitSlug } })
            )
          : null
        markDbSuccess(kitSlug)
        return NextResponse.json({ valid: Boolean(matched) })
      }

      // codesCount === 0 but static codes exist — validate against static
      markDbSuccess(kitSlug)
      return NextResponse.json({ valid: Boolean(cookieValue && configuredCodes.includes(cookieValue)) })
    } catch (e) {
      markDbFailure(kitSlug)
      console.error(`[validate-access] DB error for wiki ${kitSlug}:`, e)
      // DB down: fall back to static codes; don't lock out if no static codes configured
      if (configuredCodes.length === 0) return NextResponse.json({ valid: true })
      return NextResponse.json({ valid: Boolean(cookieValue && configuredCodes.includes(cookieValue)) })
    }
  }

  // Circuit breaker active — fall back to static codes
  if (configuredCodes.length === 0) return NextResponse.json({ valid: true })
  return NextResponse.json({ valid: Boolean(cookieValue && configuredCodes.includes(cookieValue)) })
}
