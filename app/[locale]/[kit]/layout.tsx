import KitNavbar from '@/components/kit-navbar'
import { getKit, getLessons, getWiki } from '@/lib/data'
import { redirect } from 'next/navigation'
import type { Locale } from '@/lib/i18n'
import { headers, cookies } from 'next/headers'
import { HUB_DOMAIN, normalizeHost } from '@/lib/domains'
import { getPrisma } from '@/lib/prisma-multi'

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
    try {
      const db = getPrisma(wiki.slug)
      const codesCount = await db.accessCode.count({ where: { wikiSlug: wiki.slug } })
      if (codesCount > 0) {
        const accessCookieValue = cookies().get(`wiki-${wiki.slug}-access`)?.value
        const isValid = accessCookieValue 
          ? await db.accessCode.findFirst({ where: { code: accessCookieValue, wikiSlug: wiki.slug } })
          : null
        
        if (!isValid) {
          // Find current full path if possible for redirect, or just use kit root
          const currentPath = headers().get('x-current-path') || `/${locale}/${kit}`
          redirect(`/${locale}/unlock?kit=${kit}&redirect=${encodeURIComponent(currentPath)}`)
        }
      }
    } catch (e) {
      console.error(`[KitLayout] Database error (wiki: ${wiki.slug}):`, e)
      // We continue to allow the page to load instead of crashing.
      // If access control is strictly required, you can decide to redirect or show an error here.
    }
  }

  const lessons = await getLessons(kit)
  const hostHeader = headers().get('host')
  const host = normalizeHost(hostHeader)
  const isHubDomain =
    host === HUB_DOMAIN ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1'

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

