import KitNavbar from '@/components/kit-navbar'
import { getKit, getLessons, getWiki } from '@/lib/data'
import type { Locale } from '@/lib/i18n'

export default function KitLayout(
  { children, params }: { children: React.ReactNode; params: { locale: Locale; kit: string } }
) {
  const { locale, kit } = params
  const kitData = getKit(kit)
  const wiki = kitData ? getWiki(kitData.wikiSlug) : undefined
  if (!kitData) return <div className="p-6">Kit not found</div>

  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <KitNavbar
        locale={locale}
        kitSlug={kit}
        lessons={getLessons(kit)}
        defaultLessonSlug={wiki?.defaultLessonSlug}
        resourcesUrl={wiki?.resourcesUrl}
      />
      <div className="mx-auto w-full max-w-[1920px] px-6 sm:px-10 lg:px-16 pt-24 pb-12 lg:pt-28">
        {children}
      </div>
    </div>
  )
}
