import Link from 'next/link'
import type { Lesson } from '../lib/types'
import type { Locale } from '@/lib/i18n'

export default function PrevNextNav(
  { prevLesson, nextLesson, locale, kitSlug }:
  { prevLesson?: Lesson; nextLesson?: Lesson; locale: Locale, kitSlug: string }
) {
  return (
    <div className="flex justify-between gap-4 pt-8 border-t mt-12">
      {prevLesson ? (
        <Link
          href={`/${locale}/${kitSlug}/lesson/${prevLesson.slug}`}
          className="px-4 py-3 rounded-md border text-sm hover:bg-secondary flex-1"
        >
          {'<- '} {locale === 'ar' ? prevLesson.title_ar : prevLesson.title_en}
        </Link>
      ) : <span />}
      {nextLesson ? (
        <Link
          href={`/${locale}/${kitSlug}/lesson/${nextLesson.slug}`}
          className="px-4 py-3 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 flex-1 text-right"
        >
          {locale === 'ar' ? nextLesson.title_ar : nextLesson.title_en} {' ->'}
        </Link>
      ) : <span />}
    </div>
  )
}
