import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { isHubHost } from '@/lib/domains'
import {
  getFirstLesson,
  getKit,
} from '@/lib/data'
import type { Locale } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function KitPage(
  { params }: { params: { locale: Locale; kit: string } }
) {
  const { locale, kit } = params

  const kitData = getKit(kit)
  if (!kitData) {
    notFound()
  }

  const firstLesson = await getFirstLesson(kit)
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
