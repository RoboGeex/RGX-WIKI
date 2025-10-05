import KitNavbar from '../../../components/kit-navbar'
import { getKit, getLessons, getWiki } from '../../../lib/data'
import { redirect } from 'next/navigation'
import type { Locale } from '../../../lib/i18n'

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

  const lessons = await getLessons(kit)

  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <KitNavbar
        locale={locale}
        kitSlug={kit}
        lessons={lessons}
        defaultLessonSlug={wiki?.defaultLessonSlug}
        resourcesUrl={wiki?.resourcesUrl}
      />
      <div className="mx-auto w-full max-w-[1920px] px-6 sm:px-10 lg:px-16 pt-16 pb-12 lg:pt-20">
        {children}
      </div>
    </div>
  )
}
