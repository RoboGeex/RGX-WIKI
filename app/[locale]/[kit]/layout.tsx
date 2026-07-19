export const dynamic = 'force-dynamic'

import KitNavbar from '@/components/kit-navbar'
import { getKit, getLessons, getWiki } from '@/lib/data'
import { getWikisFromDb } from '@/lib/server-data'
import { redirect } from 'next/navigation'
import type { Locale } from '@/lib/i18n'
import { headers, cookies } from 'next/headers'
import { isHubHost, normalizeHost } from '@/lib/domains'
import { getPrisma } from '@/lib/prisma-multi'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { openClassWhere } from '@/lib/class-window'
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
  let kitData = getKit(kit)
  let wiki = kitData ? getWiki(kitData.wikiSlug) : undefined
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> | null | undefined

  const resolveCurrentUser = async () => {
    if (currentUser === undefined) {
      try {
        currentUser = await getCurrentUser()
      } catch {
        currentUser = null
      }
    }
    return currentUser
  }

  // Fallback for DB-only wikis: synthesize a kit from the Wiki row.
  if (!kitData) {
    const dbWiki = (await getWikisFromDb()).find((w) => w.slug === kit)
    if (dbWiki) {
      wiki = dbWiki as any
      kitData = {
        slug: dbWiki.slug,
        wikiSlug: dbWiki.slug,
        title_en: dbWiki.displayName || dbWiki.slug,
        title_ar: dbWiki.displayName || dbWiki.slug,
        heroImage: dbWiki.picture || '/images/robogeex-logo.png',
        overview_en: '',
        overview_ar: '',
      } as any
    }
  }

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
          // DB has no codes but static codes are configured — validate against static
          shouldRequireAccess = true
          isValid = Boolean(accessCookieValue && configuredCodes.includes(accessCookieValue))
        }
        // codesCount === 0 && configuredCodes.length === 0: no codes anywhere → wiki is public
        markDbSuccess(wiki.slug)
      } catch (e) {
        markDbFailure(wiki.slug)
        console.error(`[KitLayout] Database error (wiki: ${wiki.slug}):`, e)
        // If static codes are configured, gate on those. Otherwise the wiki
        // has no access codes anywhere, so don't gate just because the DB
        // check itself failed (would lock new public wikis behind /unlock).
        shouldRequireAccess = configuredCodes.length > 0
        isValid = Boolean(accessCookieValue && configuredCodes.includes(accessCookieValue))
      }
    } else {
      // DB circuit breaker active. Same logic: only gate if static codes exist.
      shouldRequireAccess = configuredCodes.length > 0
      isValid = Boolean(accessCookieValue && configuredCodes.includes(accessCookieValue))
    }

    if (shouldRequireAccess && !isValid) {
      // Bypass access-code gate for:
      //  • admins (full access)
      //  • teachers assigned to this wiki
      //  • students with an active enrollment for this wiki
      try {
        const user = await resolveCurrentUser()
        if (user) {
          if (user.role === 'admin') {
            isValid = true
          } else if (user.role === 'teacher') {
            const teacher = await prisma.user.findUnique({ where: { id: user.id } })
            const assigned: string[] = Array.isArray(teacher?.assignedWikiSlugs)
              ? (teacher.assignedWikiSlugs as string[])
              : []
            if (assigned.includes(wiki.slug)) isValid = true
          } else if (user.role === 'student') {
            const [enrollment, trackAssignment] = await Promise.all([
              prisma.enrollment.findFirst({
                // `link: openClassWhere()` means a class that has ended (or has
                // not started) no longer grants access, without touching rows.
                where: {
                  studentId: user.id,
                  wikiSlug: wiki.slug,
                  status: 'active',
                  link: openClassWhere(),
                },
                select: { id: true },
              }),
              prisma.trackAssignment.findFirst({
                where: {
                  studentId: user.id,
                  track: { wikis: { some: { wikiSlug: wiki.slug } } },
                },
                select: { id: true },
              }),
            ])
            if (enrollment || trackAssignment) isValid = true
          }
        }
      } catch {
        // bypass check failure → fall through to unlock page
      }
    }

    if (shouldRequireAccess && !isValid) {
      // Find current full path if possible for redirect, or just use kit root.
      const currentPath = headers().get('x-current-path') || `/${locale}/${kit}`
      redirect(`/${locale}/unlock?kit=${kit}&redirect=${encodeURIComponent(currentPath)}`)
    }
  }

  const lessons = await getLessons(kit, { metadataOnly: true })
  const hostHeader = headers().get('host')
  const host = normalizeHost(hostHeader)
  const isHubDomain = isHubHost(host)
  const dashboardUser = await resolveCurrentUser()
  const dashboardLink =
    dashboardUser?.role === 'student'
      ? { href: '/home', ariaLabel: 'Back to student dashboard' }
      : dashboardUser?.role === 'teacher'
        ? { href: '/teacher', ariaLabel: 'Back to teacher dashboard' }
        : undefined

  return (
    <div className="min-h-screen bg-white sm:bg-[#eef2f1]">
      <KitNavbar
        locale={locale}
        kitSlug={kit}
        lessons={lessons}
        defaultLessonSlug={wiki?.defaultLessonSlug}
        resourcesUrl={wiki?.resourcesUrl}
        isHubDomain={isHubDomain}
        dashboardLink={dashboardLink}
      />
      <div className="mx-auto w-full max-w-[1920px] px-0 sm:px-10 lg:px-16 pt-[120px] sm:pt-16 pb-12 lg:pt-20">
        {children}
      </div>
    </div>
  )
}

