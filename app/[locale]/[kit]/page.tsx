import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { isHubHost } from '@/lib/domains'
import {
  getFirstLesson,
  getKit,
} from '@/lib/data'
import type { Locale } from '@/lib/i18n'
import { isDbOnlyMode } from '@/lib/runtime-flags'

export const dynamic = 'force-dynamic'

export default async function KitPage(
  { params }: { params: { locale: Locale; kit: string } }
) {
  const { locale, kit } = params
  const strictDbMode = process.env.USE_DB === 'true' && isDbOnlyMode()

  const kitData = getKit(kit)
  if (!kitData) {
    notFound()
  }

  let firstLesson
  try {
    firstLesson = await getFirstLesson(kit)
  } catch (error) {
    console.error(`[KitPage] Failed to load first lesson for kit "${kit}"`, error)
    if (strictDbMode) {
      redirect(`/${locale}/db-unavailable?kit=${encodeURIComponent(kit)}&reason=first-lesson-load-failed`)
    }
    throw error
  }
  if (!firstLesson) {
    notFound()
  }

  const isHub = isHubHost(headers().get('host'))
  
  if (isHub) {
    redirect(`/${kit}/${locale}/${firstLesson.slug}`)
  } else {
    redirect(`/${locale}/${firstLesson.slug}`)
  }
}
