import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { isHubHost } from '@/lib/domains'
import {
  getFirstLesson,
  getKit,
} from '@/lib/data'
import { getWikisFromDb } from '@/lib/server-data'
import { buildLessonHref } from '@/lib/wikiPaths'
import type { Locale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function KitPage(
  { params }: { params: { locale: Locale; kit: string } }
) {
  const { locale, kit } = params

  let kitData = getKit(kit)
  if (!kitData) {
    const dbWiki = (await getWikisFromDb()).find((w) => w.slug === kit)
    if (!dbWiki) {
      notFound()
    }
  }

  const firstLesson = await getFirstLesson(kit)
  if (!firstLesson) {
    notFound()
  }

  const isHub = isHubHost(headers().get('host'))

  redirect(
    buildLessonHref({
      locale,
      kitSlug: kit,
      lessonSlug: firstLesson.slug,
      isHubDomain: isHub,
    })
  )
}
