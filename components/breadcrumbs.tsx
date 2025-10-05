import Link from 'next/link'
import type { Kit, Lesson } from '../lib/types'
import type { Locale } from '@/lib/i18n'

export default function Breadcrumbs(
  { kit, moduleTitle, lesson, locale }: { kit: Kit; moduleTitle?: string; lesson?: Lesson; locale: Locale }
) {
  return (
    <nav className="text-xs flex items-center gap-2 text-gray-500">
      <Link href={`/${locale}/${kit.slug}`} className="hover:text-gray-700">
        {locale === 'ar' ? kit.title_ar : kit.title_en}
      </Link>
      {moduleTitle && (
        <>
          <span>/</span>
          <span>{moduleTitle}</span>
        </>
      )}
      {lesson && (
        <>
          <span>/</span>
          <span className="text-gray-800 font-medium">
            {locale === 'ar' ? lesson.title_ar : lesson.title_en}
          </span>
        </>
      )}
    </nav>
  )
}
