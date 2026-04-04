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
  if (lesson.id.endsWith('--draft')) {
    return lesson.id.slice(0, lesson.id.length - '--draft'.length)
  }
  return lesson.id
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
