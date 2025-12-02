import Link from 'next/link'
import { headers } from 'next/headers'
import type { Lesson } from '@/lib/types'
import type { Locale } from '@/lib/i18n'
import { getKit, getWikiByDomain } from '@/lib/data'
import { HUB_DOMAIN } from '@/lib/domains'

type Props = {
  prevLesson?: Lesson
  nextLesson?: Lesson
  locale: Locale
  kitSlug: string
}

function buildLessonHref(
  lesson: Lesson,
  locale: Locale,
  kitSlug: string,
  useFriendlyWikiPaths: boolean,
  isHubDomain: boolean,
) {
  if (isHubDomain) {
    return `/${kitSlug}/${locale}/${lesson.slug}`
  }

  if (useFriendlyWikiPaths) {
    return `/${locale}/${lesson.slug}`
  }

  return `/${locale}/${kitSlug}/lesson/${lesson.slug}`
}

export default function PrevNextNav({ prevLesson, nextLesson, locale, kitSlug }: Props) {
  const hostHeader = headers().get('host')
  const host = hostHeader ? hostHeader.split(':')[0].toLowerCase() : undefined
  const isHubDomain = host === HUB_DOMAIN
  const wiki = host ? getWikiByDomain(host) : undefined
  const kitMatchesWiki = wiki ? Boolean(getKit(kitSlug, wiki.slug)) : false

  return (
    <div className="flex justify-between gap-4 pt-8 border-t mt-12">
      {prevLesson ? (
        <Link
          href={buildLessonHref(prevLesson, locale, kitSlug, kitMatchesWiki, isHubDomain)}
          className="px-4 py-3 rounded-md border text-sm hover:bg-secondary flex-1"
        >
          {'<- '} {locale === 'ar' ? prevLesson.title_ar : prevLesson.title_en}
        </Link>
      ) : (
        <span />
      )}
      {nextLesson ? (
        <Link
          href={buildLessonHref(nextLesson, locale, kitSlug, kitMatchesWiki, isHubDomain)}
          className="px-4 py-3 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 flex-1 text-right"
        >
          {locale === 'ar' ? nextLesson.title_ar : nextLesson.title_en} {' ->'}
        </Link>
      ) : (
        <span />
      )}
    </div>
  )
}
