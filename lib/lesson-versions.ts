type VersionedLessonLike = {
  id: string
  lessonKey?: string | null
  status?: string | null
  version?: number | null
  order?: number | null
  updatedAt?: Date | string | null
  createdAt?: Date | string | null
  slug?: string | null
  ownerId?: string | null
  title_en?: string | null
  activeEditorId?: string | null
  lockedUntil?: Date | string | null
  publishedAt?: Date | string | null
}

// ensureUniqueLegacySlug/ensureUniqueRowId append a numeric counter after the
// draft suffix (e.g. "--draft-1") when a slug/id is already taken. That
// counter must be stripped too, or the bumped row is treated as belonging to
// a whole new lesson family instead of the one it's actually a draft of.
const LEGACY_DRAFT_SUFFIX_RE = /--draft(-\d+)?$/

export const LESSON_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const

export type LessonStatus = (typeof LESSON_STATUS)[keyof typeof LESSON_STATUS]

export function normalizeLessonStatus(status?: string | null): LessonStatus {
  const value = (status || '').trim().toLowerCase()
  if (value === LESSON_STATUS.PUBLISHED) return LESSON_STATUS.PUBLISHED
  if (value === LESSON_STATUS.ARCHIVED) return LESSON_STATUS.ARCHIVED
  return LESSON_STATUS.DRAFT
}

export function getLessonKey<T extends VersionedLessonLike>(lesson: T): string {
  const key = typeof lesson.lessonKey === 'string' ? lesson.lessonKey.trim() : ''
  if (key) return key
  return lesson.id.replace(LEGACY_DRAFT_SUFFIX_RE, '') || lesson.id
}

function toTimestamp(value: Date | string | null | undefined): number {
  if (!value) return 0
  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function getVersion(value: number | null | undefined): number {
  return Number.isFinite(value as number) ? Number(value) : 0
}

function compareVersionRowsDesc<T extends VersionedLessonLike>(a: T, b: T): number {
  const versionDiff = getVersion(b.version) - getVersion(a.version)
  if (versionDiff !== 0) return versionDiff

  const updatedDiff = toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt)
  if (updatedDiff !== 0) return updatedDiff

  return toTimestamp(b.createdAt) - toTimestamp(a.createdAt)
}

function compareDisplayRowsAsc<T extends VersionedLessonLike>(a: T, b: T): number {
  const orderA = Number.isFinite(a.order as number) ? Number(a.order) : 0
  const orderB = Number.isFinite(b.order as number) ? Number(b.order) : 0
  const orderDiff = orderA - orderB
  if (orderDiff !== 0) return orderDiff
  return (a.slug || '').localeCompare(b.slug || '')
}

export function sortVersionRowsDesc<T extends VersionedLessonLike>(rows: T[]): T[] {
  return rows.slice().sort(compareVersionRowsDesc)
}

export function groupLessonsByKey<T extends VersionedLessonLike>(rows: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  rows.forEach((row) => {
    const key = getLessonKey(row)
    const list = groups.get(key) || []
    list.push(row)
    groups.set(key, list)
  })
  groups.forEach((list, key) => {
    groups.set(key, sortVersionRowsDesc(list))
  })
  return groups
}

export function pickLatestByStatus<T extends VersionedLessonLike>(rows: T[], status: LessonStatus): T | undefined {
  return sortVersionRowsDesc(rows).find((row) => normalizeLessonStatus(row.status) === status)
}

export function pickLatestDraft<T extends VersionedLessonLike>(rows: T[]): T | undefined {
  return pickLatestByStatus(rows, LESSON_STATUS.DRAFT)
}

export function pickLatestPublished<T extends VersionedLessonLike>(rows: T[]): T | undefined {
  return pickLatestByStatus(rows, LESSON_STATUS.PUBLISHED)
}

export function pickEditableVersion<T extends VersionedLessonLike>(rows: T[]): T | undefined {
  const sorted = sortVersionRowsDesc(rows)
  return (
    sorted.find((row) => normalizeLessonStatus(row.status) === LESSON_STATUS.DRAFT) ||
    sorted.find((row) => normalizeLessonStatus(row.status) === LESSON_STATUS.PUBLISHED) ||
    sorted[0]
  )
}

export function pickPublicVersion<T extends VersionedLessonLike>(rows: T[]): T | undefined {
  return sortVersionRowsDesc(rows).find((row) => normalizeLessonStatus(row.status) === LESSON_STATUS.PUBLISHED)
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function normalizeLessonForComparison(lesson: any) {
  const rawSlug = String(lesson?.slug || '')
  const comparableSlug = rawSlug.replace(LEGACY_DRAFT_SUFFIX_RE, '')
  return {
    order: Number.isFinite(lesson?.order) ? Number(lesson.order) : 0,
    slug: comparableSlug,
    title_en: String(lesson?.title_en || ''),
    title_ar: String(lesson?.title_ar || ''),
    coverImage: String(lesson?.coverImage || ''),
    duration_min: Number.isFinite(lesson?.duration_min) ? Number(lesson.duration_min) : 0,
    difficulty: String(lesson?.difficulty || ''),
    prerequisites_en: Array.isArray(lesson?.prerequisites_en) ? lesson.prerequisites_en : [],
    prerequisites_ar: Array.isArray(lesson?.prerequisites_ar) ? lesson.prerequisites_ar : [],
    materials: Array.isArray(lesson?.materials) ? lesson.materials : [],
    body: Array.isArray(lesson?.body) ? lesson.body : [],
  }
}

export function hasLessonContentChanges(
  draft: VersionedLessonLike | Record<string, any> | undefined,
  published: VersionedLessonLike | Record<string, any> | undefined
): boolean {
  if (!draft || !published) return false
  const draftSignature = stableSerialize(normalizeLessonForComparison(draft))
  const publishedSignature = stableSerialize(normalizeLessonForComparison(published))
  return draftSignature !== publishedSignature
}

export function hasUnpublishedLessonChanges(
  draft: VersionedLessonLike | Record<string, any> | undefined,
  published: VersionedLessonLike | Record<string, any> | undefined
): boolean {
  if (!draft || !published) return false
  if (hasLessonContentChanges(draft, published)) return true

  const draftUpdatedAt = toTimestamp((draft as VersionedLessonLike).updatedAt)
  const publishedAt =
    toTimestamp((published as VersionedLessonLike).publishedAt) ||
    toTimestamp((published as VersionedLessonLike).updatedAt)
  return Boolean(draftUpdatedAt && publishedAt && draftUpdatedAt - publishedAt > 2000)
}

export function collapseLessonsForEditor<T extends VersionedLessonLike>(rows: T[]): T[] {
  const collapsed: T[] = []
  groupLessonsByKey(rows).forEach((versions) => {
    const picked = pickEditableVersion(versions)
    if (picked) collapsed.push(picked)
  })
  return collapsed.sort(compareDisplayRowsAsc)
}

export function collapseLessonsForPublic<T extends VersionedLessonLike>(rows: T[]): T[] {
  const collapsed: T[] = []
  groupLessonsByKey(rows).forEach((versions) => {
    const picked = pickPublicVersion(versions)
    if (picked) collapsed.push(picked)
  })
  return collapsed.sort(compareDisplayRowsAsc)
}
