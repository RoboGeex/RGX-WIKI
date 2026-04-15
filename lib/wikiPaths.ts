import type { Locale } from './i18n'

export const DEFAULT_LESSON_SLUG = 'getting-started'
export const RESOURCES_LESSON_SLUG = 'resources'
export const LEGACY_DRAFT_SUFFIX = '--draft'
const DEFAULT_LOCALE: Locale = 'en'

function normalizeLocale(locale?: Locale) {
  return locale === 'ar' ? 'ar' : DEFAULT_LOCALE
}

function normalizeLessonSlug(slug?: string | null) {
  return slug && slug.trim().length ? slug.trim() : DEFAULT_LESSON_SLUG
}

export const normalizeSlug = (s: string) => s.replace(/_/g, '-')

export function stripLegacyDraftSuffix(value: string): string {
  const normalized = normalizeSlug(value || '')
  if (normalized.endsWith(LEGACY_DRAFT_SUFFIX)) {
    return normalized.slice(0, normalized.length - LEGACY_DRAFT_SUFFIX.length)
  }
  return normalized
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
  return buildLessonHref({
    locale,
    kitSlug,
    lessonSlug: RESOURCES_LESSON_SLUG,
    isHubDomain,
  })
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
