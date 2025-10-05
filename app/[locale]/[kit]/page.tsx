import { notFound, redirect } from 'next/navigation'
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

  // Redirect to the first lesson's page.
  // The URL will be like /en/getting-started on the wiki's domain.
  redirect(`/${locale}/${firstLesson.slug}`)
}
