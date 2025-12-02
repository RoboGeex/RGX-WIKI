import type { Locale } from './i18n'

const DEFAULT_LESSON_SLUG = 'getting-started'
const DEFAULT_LOCALE: Locale = 'en'

function normalizeLocale(locale?: Locale) {
  return locale === 'ar' ? 'ar' : DEFAULT_LOCALE
}

function normalizeLessonSlug(slug?: string | null) {
  return slug && slug.trim().length ? slug.trim() : DEFAULT_LESSON_SLUG
}

type PathArgs = {
  locale?: Locale
  kitSlug: string
  isHubDomain?: boolean
}

type LessonPathArgs = PathArgs & {
  lessonSlug?: string | null
}

export function buildLessonHref({ locale, kitSlug, lessonSlug, isHubDomain }: LessonPathArgs) {
  const safeLocale = normalizeLocale(locale)
  const safeLesson = normalizeLessonSlug(lessonSlug)
  if (isHubDomain) {
    return `/${kitSlug}/${safeLocale}/${safeLesson}`
  }
  return `/${safeLocale}/${safeLesson}`
}

export function buildKitHomeHref({ locale, kitSlug, isHubDomain }: PathArgs) {
  const safeLocale = normalizeLocale(locale)
  return isHubDomain ? `/${kitSlug}/${safeLocale}` : `/${safeLocale}/${kitSlug}`
}

export function buildResourcesHref({ locale, kitSlug, isHubDomain }: PathArgs) {
  const safeLocale = normalizeLocale(locale)
  return isHubDomain ? `/${kitSlug}/${safeLocale}/resources` : `/${safeLocale}/${kitSlug}/resources`
}

export function buildDefaultLessonHref({
  locale,
  kitSlug,
  defaultLessonSlug,
  isHubDomain,
}: LessonPathArgs & { defaultLessonSlug?: string | null }) {
  const lesson = normalizeLessonSlug(defaultLessonSlug)
  return buildLessonHref({ locale, kitSlug, lessonSlug: lesson, isHubDomain })
}
