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

// Slug-collision avoidance (ensureUniqueLegacySlug et al.) appends a numeric
// counter after the draft suffix (e.g. "--draft-1", "--draft-2") when a slug
// is already taken. That suffix must be stripped too, or the row can never
// be recognized as the same lesson again on a later save or lookup.
const LEGACY_DRAFT_SUFFIX_RE = /--draft(-\d+)?$/

export function stripLegacyDraftSuffix(value: string): string {
  const normalized = normalizeSlug(value || '')
  return normalized.replace(LEGACY_DRAFT_SUFFIX_RE, '')
}

/**
 * A lesson's `slug` can drift from its stable `lessonKey` after a title edit
 * (slug is auto-regenerated from the title, lessonKey is not). Special lessons
 * like "Getting Started" must be matched against both so they don't leak into
 * regular lesson lists when their slug no longer equals the well-known value.
 */
export function isSpecialLessonSlug(lesson: { slug?: string | null; lessonKey?: string | null }): boolean {
  const root = stripLegacyDraftSuffix(lesson.slug || '')
  const key = stripLegacyDraftSuffix(lesson.lessonKey || '')
  return root === DEFAULT_LESSON_SLUG || root === RESOURCES_LESSON_SLUG ||
    key === DEFAULT_LESSON_SLUG || key === RESOURCES_LESSON_SLUG
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
