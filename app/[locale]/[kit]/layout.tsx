export const dynamic = 'force-dynamic'

import KitNavbar from '@/components/kit-navbar'
import { getKit, getLessons, getWiki } from '@/lib/data'
import { redirect } from 'next/navigation'
import type { Locale } from '@/lib/i18n'
import { headers, cookies } from 'next/headers'
import { isHubHost, normalizeHost } from '@/lib/domains'
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

export default async function KitLayout(
  { children, params }: { children: React.ReactNode; params: { locale: Locale; kit: string } }
) {
  const { locale, kit } = params
  const kitData = getKit(kit)
  const wiki = kitData ? getWiki(kitData.wikiSlug) : undefined
  
  // If kit not found, redirect to default kit
  if (!kitData) {
    redirect(`/${locale}/student-kit`)
  }

  // Access check
  if (process.env.USE_DB === 'true' && wiki) {
    const configuredCodes = getConfiguredCodes(wiki.slug)
    const accessCookieValue = cookies().get(`wiki-${wiki.slug}-access`)?.value?.trim()
    let shouldRequireAccess = configuredCodes.length > 0
    let isValid = false

    if (!shouldBypassDb(wiki.slug)) {
      try {
        const db = getPrisma(wiki.slug)
        const codesCount = await withDbTimeout(() => db.accessCode.count({ where: { wikiSlug: wiki.slug } }))
        if (codesCount > 0) {
          shouldRequireAccess = true
          const matchedCode = accessCookieValue
            ? await withDbTimeout(() =>
                db.accessCode.findFirst({ where: { code: accessCookieValue, wikiSlug: wiki.slug } })
              )
            : null
          isValid = Boolean(matchedCode)
        } else if (configuredCodes.length > 0) {
          isValid = Boolean(accessCookieValue && configuredCodes.includes(accessCookieValue))
        }
        markDbSuccess(wiki.slug)
      } catch (e) {
        markDbFailure(wiki.slug)
        console.error(`[KitLayout] Database error (wiki: ${wiki.slug}):`, e)
        // Fail closed on DB errors. If static codes are configured, allow those.
        shouldRequireAccess = true
        isValid = Boolean(accessCookieValue && configuredCodes.includes(accessCookieValue))
      }
    } else {
      // Fail closed while DB circuit breaker is active.
      shouldRequireAccess = true
      isValid = Boolean(accessCookieValue && configuredCodes.includes(accessCookieValue))
    }

    if (shouldRequireAccess && !isValid) {
      // Find current full path if possible for redirect, or just use kit root.
      const currentPath = headers().get('x-current-path') || `/${locale}/${kit}`
      redirect(`/${locale}/unlock?kit=${kit}&redirect=${encodeURIComponent(currentPath)}`)
    }
  }

  const lessons = await getLessons(kit)
  const hostHeader = headers().get('host')
  const host = normalizeHost(hostHeader)
  const isHubDomain = isHubHost(host)

  return (
    <div className="min-h-screen bg-white sm:bg-[#eef2f1]">
      <KitNavbar
        locale={locale}
        kitSlug={kit}
        lessons={lessons}
        defaultLessonSlug={wiki?.defaultLessonSlug}
        resourcesUrl={wiki?.resourcesUrl}
        isHubDomain={isHubDomain}
      />
      <div className="mx-auto w-full max-w-[1920px] px-0 sm:px-10 lg:px-16 pt-[120px] sm:pt-16 pb-12 lg:pt-20">
        {children}
      </div>
    </div>
  )
}

