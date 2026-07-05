import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { getWiki } from '@/lib/data'
import { getWikisFromDb } from '@/lib/server-data'
import { getPrisma } from '@/lib/prisma-multi'
import { canEditLesson, canManageWiki } from '@/lib/assignments'
import { findDeveloperById } from '@/lib/developers'
import { getActorIdFromRequest } from '@/lib/api-auth'
import { markDbFailure, markDbSuccess, shouldBypassDb, withDbTimeout } from '@/lib/db-fallback'
import {
  LESSON_STATUS,
  collapseLessonsForEditor,
  collapseLessonsForPublic,
  getLessonKey,
  groupLessonsByKey,
  hasUnpublishedLessonChanges,
  pickLatestDraft,
  pickLatestPublished,
  sortVersionRowsDesc,
} from '@/lib/lesson-versions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type LessonBodyItem = {
  type:
    | 'paragraph'
    | 'heading'
    | 'step'
    | 'callout'
    | 'codeTabs'
    | 'image'
    | 'list'
    | 'youtube'
    | 'video'
    | 'table'
    | 'imageSlider'
    | 'tagBlock'
    | 'horizontalRule'
    | 'columns'
    | 'column'
    | 'code'
  en?: string
  ar?: string
  html_en?: string
  html_ar?: string
  title_en?: string
  title_ar?: string
  caption_en?: string
  caption_ar?: string
  variant?: 'info' | 'tip' | 'warning'
  image?: string
  images?: string[]
  arduino?: string
  makecodeUrl?: string
  level?: number
  ordered?: boolean
  items_en?: string[]
  items_ar?: string[]
  url?: string
  poster?: string
  width?: number
  height?: number
  json_en?: any
  json_ar?: any
}

type NewLesson = {
  id: string
  lessonKey?: string
  order: number
  slug: string
  wikiSlug: string
  title_en: string
  title_ar: string
  coverImage?: string
  ownerId?: string
  lastModifiedBy?: string
  status?: string
  publishedAt?: string
  duration_min: number
  difficulty: string
  prerequisites_en: string[]
  prerequisites_ar: string[]
  materials: { qty: number; name_en: string; name_ar: string; sku?: string }[]
  body: LessonBodyItem[]
  version?: number
}

type LessonPayload = NewLesson & { forceNew?: boolean }

type VersionConflictError = {
  status: 409
  error: string
  errorCode: 'VERSION_CONFLICT'
  currentVersion: number
}

type LockConflictError = {
  status: 409
  error: string
  errorCode: 'LOCKED_BY_OTHER'
}

type ApiError = {
  status: number
  error: string
  missing?: string[]
  details?: string
  errorCode?: string
  currentVersion?: number
}

function lessonsFilePath(wikiSlug: string) {
  return path.join(process.cwd(), 'data', 'lessons.' + wikiSlug + '.json')
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeStatus(value: string | undefined | null, isAdmin: boolean): string {
  const normalized = (value || '').trim().toLowerCase()
  if (normalized === LESSON_STATUS.PUBLISHED && isAdmin) return LESSON_STATUS.PUBLISHED
  return LESSON_STATUS.DRAFT
}

const LEGACY_DRAFT_SUFFIX = '--draft'
// ensureUniqueLegacySlug/ensureUniqueRowId append a numeric counter after the
// draft suffix (e.g. "--draft-1") when a slug/id is already taken. That
// counter must be recognized too, or the bumped row can never be matched
// back to its lesson family on a later save/lock/lookup.
const LEGACY_DRAFT_SUFFIX_RE = /--draft(-\d+)?$/

function isLegacyDraftValue(value: string | undefined | null): boolean {
  const normalized = (value || '').trim()
  return Boolean(normalized && LEGACY_DRAFT_SUFFIX_RE.test(normalized))
}

function stripLegacyDraftSuffix(value: string | undefined | null): string {
  const normalized = (value || '').trim()
  return normalized.replace(LEGACY_DRAFT_SUFFIX_RE, '')
}

function toLegacyDraftValue(baseValue: string): string {
  const normalized = stripLegacyDraftSuffix(baseValue) || 'lesson'
  return `${normalized}${LEGACY_DRAFT_SUFFIX}`
}

function getVersion(value: unknown): number {
  return Number.isFinite(value as number) ? Number(value) : 0
}

function pickLatestAny(rows: any[]): any | undefined {
  const sorted = sortVersionRowsDesc(rows)
  return sorted[0]
}

function toIsoDate(value: unknown): string {
  if (!value) return ''
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    const parsed = new Date(trimmed)
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : trimmed
  }
  return ''
}

function enrichLessonsWithPublishState(rows: any[], collapsed: any[], publishedOnly: boolean): any[] {
  if (publishedOnly) return collapsed

  const grouped = groupLessonsByKey(rows)
  return collapsed.map((lesson) => {
    const versions = grouped.get(lesson.lessonKey || lesson.id) || []
    const latestDraft = pickLatestDraft(versions)
    const latestPublished = pickLatestPublished(versions)
    const hasPublishedVersion = Boolean(latestPublished)
    return {
      ...lesson,
      status: hasPublishedVersion ? LESSON_STATUS.PUBLISHED : lesson.status,
      lastPublishedAt: toIsoDate((latestPublished as any)?.publishedAt),
      hasUnpublishedChanges: hasUnpublishedLessonChanges(latestDraft, latestPublished),
    }
  })
}

function toApiError(status: number, error: string, extra?: Partial<ApiError>): ApiError {
  return { status, error, ...extra }
}

function isApiError(error: unknown): error is ApiError {
  return Boolean(error && typeof error === 'object' && 'status' in (error as any) && 'error' in (error as any))
}

function isLessonKeyUnsupportedError(error: any): boolean {
  const message = typeof error?.message === 'string' ? error.message : ''
  const lowerMessage = message.toLowerCase()
  const missingColumn =
    lowerMessage.includes('lessonkey') &&
    (lowerMessage.includes('does not exist') || lowerMessage.includes('unknown field') || lowerMessage.includes('unknown argument'))
  const metaColumn = typeof error?.meta?.column === 'string' ? error.meta.column.toLowerCase() : ''
  const prismaMetaColumn = metaColumn.endsWith('.lesson.lessonkey') || metaColumn === 'lessonkey'
  return (
    message.includes('Unknown argument `lessonKey`') ||
    message.includes('Unknown field `lessonKey`') ||
    missingColumn ||
    prismaMetaColumn
  )
}

const LEGACY_LESSON_OPTIONAL_COLUMNS = ['lessonkey', 'version', 'activeeditorid', 'lockeduntil'] as const

function isLegacyLessonReadSchemaError(error: any): boolean {
  if (isLessonKeyUnsupportedError(error)) return true

  const message = typeof error?.message === 'string' ? error.message : ''
  const lowerMessage = message.toLowerCase()
  const missingColumnHint =
    lowerMessage.includes('unknown column') ||
    lowerMessage.includes('does not exist') ||
    lowerMessage.includes('unknown field') ||
    lowerMessage.includes('unknown argument') ||
    lowerMessage.includes('field does not exist')
  const mentionsLegacyColumn = LEGACY_LESSON_OPTIONAL_COLUMNS.some((column) => lowerMessage.includes(column))
  const metaColumn = typeof error?.meta?.column === 'string' ? error.meta.column.toLowerCase() : ''
  const prismaMetaColumn = LEGACY_LESSON_OPTIONAL_COLUMNS.some(
    (column) => metaColumn.endsWith(`.lesson.${column}`) || metaColumn === column
  )
  const unknownPrismaField = ['version', 'activeEditorId', 'lockedUntil'].some(
    (column) => message.includes(`Unknown argument \`${column}\``) || message.includes(`Unknown field \`${column}\``)
  )
  return (missingColumnHint && mentionsLegacyColumn) || prismaMetaColumn || unknownPrismaField
}

const legacyLessonSelect = {
  id: true,
  order: true,
  slug: true,
  wikiSlug: true,
  title_en: true,
  title_ar: true,
  coverImage: true,
  ownerId: true,
  lastModifiedBy: true,
  status: true,
  publishedAt: true,
  duration_min: true,
  difficulty: true,
  prerequisites_en: true,
  prerequisites_ar: true,
  materials: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  activeEditorId: true,
  lockedUntil: true,
} as const

const legacyLessonReadSelect = {
  id: true,
  order: true,
  slug: true,
  wikiSlug: true,
  title_en: true,
  title_ar: true,
  coverImage: true,
  ownerId: true,
  lastModifiedBy: true,
  status: true,
  publishedAt: true,
  duration_min: true,
  difficulty: true,
  prerequisites_en: true,
  prerequisites_ar: true,
  materials: true,
  body: true,
  createdAt: true,
  updatedAt: true,
} as const

const lessonListSelect = {
  id: true,
  lessonKey: true,
  order: true,
  slug: true,
  wikiSlug: true,
  title_en: true,
  title_ar: true,
  coverImage: true,
  ownerId: true,
  lastModifiedBy: true,
  status: true,
  publishedAt: true,
  duration_min: true,
  difficulty: true,
  prerequisites_en: true,
  prerequisites_ar: true,
  materials: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  activeEditorId: true,
  lockedUntil: true,
} as const

const legacyLessonListSelect = {
  id: true,
  order: true,
  slug: true,
  wikiSlug: true,
  title_en: true,
  title_ar: true,
  coverImage: true,
  ownerId: true,
  lastModifiedBy: true,
  status: true,
  publishedAt: true,
  duration_min: true,
  difficulty: true,
  prerequisites_en: true,
  prerequisites_ar: true,
  materials: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  activeEditorId: true,
  lockedUntil: true,
} as const

function mapLegacyLessonRow<T extends Record<string, any>>(row: T): T & { lessonKey: string } {
  const normalizedLessonKey =
    typeof row.lessonKey === 'string' && row.lessonKey.trim()
      ? row.lessonKey
      : stripLegacyDraftSuffix(String(row.id || '')) || stripLegacyDraftSuffix(String(row.slug || '')) || String(row.id || '')
  return {
    ...row,
    lessonKey: normalizedLessonKey,
    version: Number.isFinite((row as any)?.version) ? Number((row as any).version) : 0,
    activeEditorId: (row as any)?.activeEditorId || null,
    lockedUntil: (row as any)?.lockedUntil || null,
  }
}

function toJsonValue(value: unknown): string {
  return JSON.stringify(value ?? null)
}

async function insertLegacyLessonRow(
  tx: any,
  row: {
    id: string
    wikiSlug: string
    order: number
    slug: string
    title_en: string
    title_ar: string
    coverImage: string | null
    ownerId: string | null
    lastModifiedBy: string | null
    status: string
    publishedAt: Date | null
    duration_min: number
    difficulty: string
    prerequisites_en: unknown
    prerequisites_ar: unknown
    materials: unknown
    body: unknown
    createdAt?: Date
    updatedAt: Date
  }
) {
  const createdAt = row.createdAt || row.updatedAt
  await tx.$executeRawUnsafe(
    `INSERT INTO \`Lesson\` (
      \`id\`, \`order\`, \`slug\`, \`wikiSlug\`, \`title_en\`, \`title_ar\`, \`coverImage\`, \`ownerId\`,
      \`lastModifiedBy\`, \`status\`, \`publishedAt\`, \`duration_min\`, \`difficulty\`,
      \`prerequisites_en\`, \`prerequisites_ar\`, \`materials\`, \`body\`,
      \`createdAt\`, \`updatedAt\`
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.order,
    row.slug,
    row.wikiSlug,
    row.title_en,
    row.title_ar,
    row.coverImage,
    row.ownerId,
    row.lastModifiedBy,
    row.status,
    row.publishedAt,
    row.duration_min,
    row.difficulty,
    toJsonValue(row.prerequisites_en),
    toJsonValue(row.prerequisites_ar),
    toJsonValue(row.materials),
    toJsonValue(row.body),
    createdAt,
    row.updatedAt,
  )

  const inserted = await tx.lesson.findUnique({
    where: { id: row.id },
    select: legacyLessonReadSelect,
  })
  if (!inserted) {
    throw new Error('Failed to load inserted legacy lesson row')
  }
  return mapLegacyLessonRow(inserted)
}

async function updateLegacyLessonRow(
  tx: any,
  row: {
    id: string
    wikiSlug: string
    order: number
    slug: string
    title_en: string
    title_ar: string
    coverImage: string | null
    ownerId: string | null
    lastModifiedBy: string | null
    status: string
    publishedAt: Date | null
    duration_min: number
    difficulty: string
    prerequisites_en: unknown
    prerequisites_ar: unknown
    materials: unknown
    body: unknown
    updatedAt: Date
  }
) {
  await tx.$executeRawUnsafe(
    `UPDATE \`Lesson\` SET
      \`order\` = ?,
      \`slug\` = ?,
      \`wikiSlug\` = ?,
      \`title_en\` = ?,
      \`title_ar\` = ?,
      \`coverImage\` = ?,
      \`ownerId\` = ?,
      \`lastModifiedBy\` = ?,
      \`status\` = ?,
      \`publishedAt\` = ?,
      \`duration_min\` = ?,
      \`difficulty\` = ?,
      \`prerequisites_en\` = ?,
      \`prerequisites_ar\` = ?,
      \`materials\` = ?,
      \`body\` = ?,
      \`updatedAt\` = ?
    WHERE \`id\` = ?`,
    row.order,
    row.slug,
    row.wikiSlug,
    row.title_en,
    row.title_ar,
    row.coverImage,
    row.ownerId,
    row.lastModifiedBy,
    row.status,
    row.publishedAt,
    row.duration_min,
    row.difficulty,
    toJsonValue(row.prerequisites_en),
    toJsonValue(row.prerequisites_ar),
    toJsonValue(row.materials),
    toJsonValue(row.body),
    row.updatedAt,
    row.id,
  )

  const updated = await tx.lesson.findUnique({
    where: { id: row.id },
    select: legacyLessonReadSelect,
  })
  if (!updated) {
    throw new Error('Failed to load updated legacy lesson row')
  }
  return mapLegacyLessonRow(updated)
}

function ensureLockAndVersionOrThrow(
  reference: any | undefined,
  clientVersion: number | undefined,
  actorId: string | undefined
) {
  if (!reference) return
  if (Number.isFinite(clientVersion as number) && getVersion(reference.version) > Number(clientVersion)) {
    const versionError: VersionConflictError = {
      status: 409,
      error: 'Conflict: This lesson was modified by someone else since you opened it.',
      errorCode: 'VERSION_CONFLICT',
      currentVersion: getVersion(reference.version),
    }
    throw versionError
  }
  const now = new Date()
  if (
    reference.activeEditorId &&
    reference.activeEditorId !== actorId &&
    reference.lockedUntil &&
    new Date(reference.lockedUntil) > now
  ) {
    const lockError: LockConflictError = {
      status: 409,
      error: 'Conflict: This lesson is currently actively locked by another developer.',
      errorCode: 'LOCKED_BY_OTHER',
    }
    throw lockError
  }
}

async function readLessonsFromFile(wikiSlug: string): Promise<NewLesson[]> {
  try {
    const filePath = lessonsFilePath(wikiSlug)
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as NewLesson[]
    return parsed.map((lesson) => ({
      ...lesson,
      lessonKey: lesson.lessonKey || lesson.id,
    }))
  } catch {
    return []
  }
}

function sortLessons(list: NewLesson[]): NewLesson[] {
  return list.slice().sort((a, b) => (a.order || 0) - (b.order || 0))
}

function compactLessonFamilyInFile(lessons: NewLesson[], lessonKey: string, keepIds: Array<string | undefined | null>) {
  const key = (lessonKey || '').trim()
  if (!key) return lessons

  const allowed = new Set(
    keepIds
      .map((id) => (id || '').trim())
      .filter(Boolean)
  )

  return lessons.filter((item) => {
    if ((item.lessonKey || item.id) !== key) return true
    return allowed.has((item.id || '').trim())
  })
}

function resolveLessonFamilyInFile(lessons: NewLesson[], lesson: NewLesson) {
  const incomingKey = (lesson.lessonKey || '').trim()
  const incomingId = (lesson.id || '').trim()
  const incomingSlug = (lesson.slug || '').trim()

  let matched =
    (incomingId ? lessons.find((item) => item.id === incomingId) : undefined) ||
    (incomingKey ? lessons.find((item) => (item.lessonKey || item.id) === incomingKey) : undefined) ||
    (incomingSlug ? lessons.find((item) => item.slug === incomingSlug) : undefined)

  if (!matched) {
    return {
      lessonKey: incomingKey || incomingId || incomingSlug,
      family: [] as NewLesson[],
    }
  }

  const lessonKey = matched.lessonKey || matched.id
  return {
    lessonKey,
    family: lessons.filter((item) => (item.lessonKey || item.id) === lessonKey),
  }
}

function ensureUniqueFileRowId(lessons: NewLesson[], baseId: string): string {
  const base = baseId && baseId.trim() ? baseId.trim() : 'lesson'
  let candidate = base
  let counter = 1
  while (lessons.some((item) => item.id === candidate)) {
    candidate = `${base}-${counter++}`
  }
  return candidate
}

function ensureUniqueFileSlug(lessons: NewLesson[], wikiSlug: string, lessonKey: string, baseSlug: string): string {
  const base = baseSlug && baseSlug.trim() ? baseSlug.trim() : 'lesson'
  let candidate = base
  let counter = 1
  while (
    lessons.some(
      (item) =>
        item.wikiSlug === wikiSlug &&
        item.slug === candidate &&
        (item.lessonKey || item.id) !== lessonKey
    )
  ) {
    candidate = `${base}-${counter++}`
  }
  return candidate
}

async function ensureUniqueRowId(prisma: any, baseId: string): Promise<string> {
  const base = baseId && baseId.trim() ? baseId.trim() : 'lesson'
  let candidate = base
  let counter = 1
  while (true) {
    const existing = await prisma.lesson.findUnique({
      where: { id: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
    candidate = `${base}-${counter++}`
  }
}

async function ensureUniqueLessonKey(prisma: any, wikiSlug: string, baseKey: string): Promise<string> {
  const base = baseKey && baseKey.trim() ? baseKey.trim() : 'lesson'
  let candidate = base
  let counter = 1
  while (true) {
    let existing: any
    try {
      existing = await prisma.lesson.findFirst({
        where: { wikiSlug, lessonKey: candidate },
        select: { id: true },
      })
    } catch (error: any) {
      if (!isLessonKeyUnsupportedError(error)) throw error
      existing = await prisma.lesson.findFirst({
        where: { wikiSlug, id: candidate },
        select: { id: true },
      })
    }
    if (!existing) return candidate
    candidate = `${base}-${counter++}`
  }
}

async function ensureUniqueSlugForLessonKey(
  prisma: any,
  wikiSlug: string,
  baseSlug: string,
  lessonKey: string
): Promise<string> {
  const base = baseSlug && baseSlug.trim() ? baseSlug.trim() : 'lesson'
  let candidate = base
  let counter = 1
  while (true) {
    let conflict: any
    try {
      conflict = await prisma.lesson.findFirst({
        where: {
          wikiSlug,
          slug: candidate,
          NOT: { lessonKey },
        },
        select: { id: true },
      })
    } catch (error: any) {
      if (!isLessonKeyUnsupportedError(error)) throw error
      conflict = await prisma.lesson.findFirst({
        where: {
          wikiSlug,
          slug: candidate,
          NOT: { id: lessonKey },
        },
        select: { id: true },
      })
    }
    if (!conflict) return candidate
    candidate = `${base}-${counter++}`
  }
}

async function compactLessonFamilyRows(
  tx: any,
  wikiSlug: string,
  lessonKey: string,
  keepIds: Array<string | undefined | null>,
) {
  const normalizedLessonKey = (lessonKey || '').trim()
  if (!normalizedLessonKey) return

  const keep = Array.from(
    new Set(
      keepIds
        .map((id) => (id || '').trim())
        .filter(Boolean)
    )
  )

  await tx.lesson.deleteMany({
    where: {
      wikiSlug,
      lessonKey: normalizedLessonKey,
      ...(keep.length > 0 ? { id: { notIn: keep } } : {}),
    },
  })
}

async function supportsLessonKeyColumn(prisma: any, wikiSlug: string): Promise<boolean> {
  try {
    await prisma.lesson.findFirst({
      where: { wikiSlug },
      select: { lessonKey: true },
    })
    return true
  } catch (error: any) {
    if (isLessonKeyUnsupportedError(error)) {
      return false
    }
    throw error
  }
}

async function resolveLessonFamilyInDb(prisma: any, lesson: NewLesson, forceNew: boolean) {
  if (forceNew) {
    return { lessonKey: '', familyRows: [] as any[] }
  }

  const wikiSlug = lesson.wikiSlug
  const idCandidate = (lesson.id || '').trim()
  const keyCandidate = (lesson.lessonKey || '').trim()
  const slugCandidate = (lesson.slug || '').trim()
  const candidates = [idCandidate, keyCandidate, slugCandidate].filter(Boolean)

  let matched: any | undefined
  for (const candidate of candidates) {
    try {
      const exact = await prisma.lesson.findUnique({ where: { id: candidate } })
      if (exact && exact.wikiSlug === wikiSlug) {
        matched = exact
      } else {
        matched = await prisma.lesson.findFirst({
          where: {
            wikiSlug,
            OR: [{ lessonKey: candidate }, { slug: candidate }],
          },
          orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
          select: { id: true, lessonKey: true, slug: true },
        })
      }
    } catch (error: any) {
      if (!isLessonKeyUnsupportedError(error)) throw error
      const row = await prisma.lesson.findFirst({
        where: {
          wikiSlug,
          OR: [{ id: candidate }, { slug: candidate }],
        },
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        select: legacyLessonSelect,
      })
      matched = row ? mapLegacyLessonRow(row) : row
    }
    if (matched) break
  }

  const lessonKey = matched ? getLessonKey(matched) : ''
  if (!lessonKey) {
    return { lessonKey: '', familyRows: [] as any[] }
  }

  let familyRows: any[]
  try {
    familyRows = await prisma.lesson.findMany({
      where: { wikiSlug, lessonKey },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
    })
  } catch (error: any) {
    if (!isLessonKeyUnsupportedError(error)) throw error
    familyRows = (await prisma.lesson.findMany({
      where: {
        wikiSlug,
        OR: [{ id: lessonKey }, { slug: lessonKey }, { id: `${lessonKey}--draft` }, { slug: `${lessonKey}--draft` }],
      },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
      select: legacyLessonSelect,
    })).map(mapLegacyLessonRow)
  }

  return { lessonKey, familyRows }
}

async function ensureUniqueLegacySlug(
  prisma: any,
  wikiSlug: string,
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  const base = baseSlug && baseSlug.trim() ? baseSlug.trim() : 'lesson'
  let candidate = base
  let counter = 1
  while (true) {
    const conflict = await prisma.lesson.findFirst({
      where: {
        wikiSlug,
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    })
    if (!conflict) return candidate
    candidate = `${base}-${counter++}`
  }
}

async function saveLegacyLessonInDb(
  prisma: any,
  lesson: NewLesson,
  forceNew: boolean,
  developer: any,
  requestedStatus: string,
  clientVersion: number | undefined
) {
  return prisma.$transaction(async (tx: any) => {
    const lookupId = (lesson.id || '').trim()
    const lookupSlug = (lesson.slug || '').trim()
    const existingRaw = forceNew
      ? null
      : await tx.lesson.findFirst({
          where: {
            wikiSlug: lesson.wikiSlug,
            OR: [
            ...(lookupId ? [{ id: lookupId }] : []),
            ...(lookupSlug ? [{ slug: lookupSlug }] : []),
              ...(lookupId ? [{ id: toLegacyDraftValue(lookupId) }] : []),
              ...(lookupSlug ? [{ slug: toLegacyDraftValue(lookupSlug) }] : []),
            ],
          },
          orderBy: [{ updatedAt: 'desc' }],
          select: legacyLessonReadSelect,
        })
    const existing = existingRaw ? mapLegacyLessonRow(existingRaw) : null

    if (existing && !canEditLesson(developer, lesson.wikiSlug, existing.ownerId)) {
      throw toApiError(403, 'Forbidden: You do not have permission to edit this lesson')
    }

    ensureLockAndVersionOrThrow(existing, clientVersion, developer?.id)

    const baseId =
      stripLegacyDraftSuffix((existing?.id || '').trim()) ||
      stripLegacyDraftSuffix(lookupId) ||
      stripLegacyDraftSuffix((lesson.id || '').trim()) ||
      slugify(lesson.title_en || lesson.title_ar || 'lesson')
    const baseSlug =
      stripLegacyDraftSuffix((existing?.slug || '').trim()) ||
      stripLegacyDraftSuffix(lookupSlug) ||
      stripLegacyDraftSuffix((lesson.slug || '').trim()) ||
      baseId

    const familyRowsRaw = await tx.lesson.findMany({
      where: {
        wikiSlug: lesson.wikiSlug,
        OR: [
          { id: baseId },
          { id: toLegacyDraftValue(baseId) },
          { slug: baseSlug },
          { slug: toLegacyDraftValue(baseSlug) },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: legacyLessonReadSelect,
    })
    const familyRows = familyRowsRaw.map(mapLegacyLessonRow)

    const latestDraft = familyRows.find(
      (row: any) =>
        normalizeStatus(row.status, true) === LESSON_STATUS.DRAFT ||
        isLegacyDraftValue(row.id) ||
        isLegacyDraftValue(row.slug)
    )
    const latestPublished = familyRows.find(
      (row: any) =>
        normalizeStatus(row.status, true) === LESSON_STATUS.PUBLISHED &&
        !isLegacyDraftValue(row.id) &&
        !isLegacyDraftValue(row.slug)
    )

    const reference = latestDraft || latestPublished || existing

    const maxOrderResult = await tx.lesson.aggregate({
      where: { wikiSlug: lesson.wikiSlug },
      _max: { order: true },
    })
    const nextOrder = (maxOrderResult?._max?.order || 0) + 1
    const finalOrder =
      Number.isFinite(lesson.order) && lesson.order > 0
        ? Math.round(lesson.order)
        : Number.isFinite(reference?.order)
          ? Number(reference.order)
          : nextOrder

    const finalTitleEn = (lesson.title_en || reference?.title_en || '').trim()
    const finalTitleAr = (lesson.title_ar || reference?.title_ar || finalTitleEn).trim()
    const finalDuration =
      Number.isFinite(lesson.duration_min) && lesson.duration_min > 0
        ? Math.round(lesson.duration_min)
        : Number.isFinite(reference?.duration_min)
          ? Number(reference.duration_min)
          : 30

    const now = new Date()

    const baseData = {
      wikiSlug: lesson.wikiSlug,
      order: finalOrder,
      title_en: finalTitleEn,
      title_ar: finalTitleAr,
      coverImage: lesson.coverImage || reference?.coverImage || null,
      ownerId: lesson.ownerId || reference?.ownerId || developer?.id || null,
      lastModifiedBy: lesson.lastModifiedBy || developer?.id || reference?.lastModifiedBy || null,
      duration_min: finalDuration,
      difficulty: lesson.difficulty || reference?.difficulty || 'Beginner',
      prerequisites_en: Array.isArray(lesson.prerequisites_en)
        ? lesson.prerequisites_en
        : reference?.prerequisites_en || [],
      prerequisites_ar: Array.isArray(lesson.prerequisites_ar)
        ? lesson.prerequisites_ar
        : reference?.prerequisites_ar || [],
      materials: Array.isArray(lesson.materials) ? lesson.materials : reference?.materials || [],
      body: Array.isArray(lesson.body) ? lesson.body : reference?.body || [],
      updatedAt: now,
    }

    if (requestedStatus === LESSON_STATUS.DRAFT) {
      const draftId = latestDraft?.id || await ensureUniqueRowId(tx, toLegacyDraftValue(baseId))
      const draftSlug = await ensureUniqueLegacySlug(
        tx,
        lesson.wikiSlug,
        latestDraft?.slug || toLegacyDraftValue(baseSlug),
        latestDraft?.id
      )
      const draftData = {
        ...baseData,
        slug: draftSlug,
        status: LESSON_STATUS.DRAFT,
        publishedAt: null,
      }

      const row = latestDraft
        ? await updateLegacyLessonRow(tx, {
            id: latestDraft.id,
            wikiSlug: lesson.wikiSlug,
            order: draftData.order,
            slug: draftData.slug,
            title_en: draftData.title_en,
            title_ar: draftData.title_ar,
            coverImage: draftData.coverImage,
            ownerId: draftData.ownerId,
            lastModifiedBy: draftData.lastModifiedBy,
            status: draftData.status,
            publishedAt: draftData.publishedAt,
            duration_min: draftData.duration_min,
            difficulty: draftData.difficulty,
            prerequisites_en: draftData.prerequisites_en,
            prerequisites_ar: draftData.prerequisites_ar,
            materials: draftData.materials,
            body: draftData.body,
            updatedAt: draftData.updatedAt,
          })
        : await insertLegacyLessonRow(tx, {
            id: draftId,
            wikiSlug: lesson.wikiSlug,
            order: draftData.order,
            slug: draftData.slug,
            title_en: draftData.title_en,
            title_ar: draftData.title_ar,
            coverImage: draftData.coverImage,
            ownerId: draftData.ownerId,
            lastModifiedBy: draftData.lastModifiedBy,
            status: draftData.status,
            publishedAt: draftData.publishedAt,
            duration_min: draftData.duration_min,
            difficulty: draftData.difficulty,
            prerequisites_en: draftData.prerequisites_en,
            prerequisites_ar: draftData.prerequisites_ar,
            materials: draftData.materials,
            body: draftData.body,
            updatedAt: draftData.updatedAt,
          })

      return {
        row,
        isUpdate: Boolean(latestDraft),
        lastPublishedAt: latestPublished?.publishedAt || null,
      }
    }

    const publishSlugBase =
      stripLegacyDraftSuffix((lesson.slug || '').trim()) ||
      stripLegacyDraftSuffix((reference?.slug || '').trim()) ||
      baseSlug
    const publishSlug = await ensureUniqueLegacySlug(tx, lesson.wikiSlug, publishSlugBase, latestPublished?.id)

    const draftSnapshotId = latestDraft?.id || await ensureUniqueRowId(tx, toLegacyDraftValue(baseId))
    const draftSnapshotSlug = await ensureUniqueLegacySlug(
      tx,
      lesson.wikiSlug,
      latestDraft?.slug || toLegacyDraftValue(publishSlug),
      latestDraft?.id
    )
    const draftSnapshotData = {
      ...baseData,
      slug: draftSnapshotSlug,
      status: LESSON_STATUS.DRAFT,
      publishedAt: null,
    }

    if (latestDraft) {
      await updateLegacyLessonRow(tx, {
        id: latestDraft.id,
        wikiSlug: lesson.wikiSlug,
        order: draftSnapshotData.order,
        slug: draftSnapshotData.slug,
        title_en: draftSnapshotData.title_en,
        title_ar: draftSnapshotData.title_ar,
        coverImage: draftSnapshotData.coverImage,
        ownerId: draftSnapshotData.ownerId,
        lastModifiedBy: draftSnapshotData.lastModifiedBy,
        status: draftSnapshotData.status,
        publishedAt: draftSnapshotData.publishedAt,
        duration_min: draftSnapshotData.duration_min,
        difficulty: draftSnapshotData.difficulty,
        prerequisites_en: draftSnapshotData.prerequisites_en,
        prerequisites_ar: draftSnapshotData.prerequisites_ar,
        materials: draftSnapshotData.materials,
        body: draftSnapshotData.body,
        updatedAt: draftSnapshotData.updatedAt,
      })
    } else {
      await insertLegacyLessonRow(tx, {
        id: draftSnapshotId,
        wikiSlug: lesson.wikiSlug,
        order: draftSnapshotData.order,
        slug: draftSnapshotData.slug,
        title_en: draftSnapshotData.title_en,
        title_ar: draftSnapshotData.title_ar,
        coverImage: draftSnapshotData.coverImage,
        ownerId: draftSnapshotData.ownerId,
        lastModifiedBy: draftSnapshotData.lastModifiedBy,
        status: draftSnapshotData.status,
        publishedAt: draftSnapshotData.publishedAt,
        duration_min: draftSnapshotData.duration_min,
        difficulty: draftSnapshotData.difficulty,
        prerequisites_en: draftSnapshotData.prerequisites_en,
        prerequisites_ar: draftSnapshotData.prerequisites_ar,
        materials: draftSnapshotData.materials,
        body: draftSnapshotData.body,
        updatedAt: draftSnapshotData.updatedAt,
      })
    }

    const publishedData = {
      ...baseData,
      slug: publishSlug,
      status: LESSON_STATUS.PUBLISHED,
      publishedAt: now,
    }

    const row = latestPublished
      ? await updateLegacyLessonRow(tx, {
          id: latestPublished.id,
          wikiSlug: lesson.wikiSlug,
          order: publishedData.order,
          slug: publishedData.slug,
          title_en: publishedData.title_en,
          title_ar: publishedData.title_ar,
          coverImage: publishedData.coverImage,
          ownerId: publishedData.ownerId,
          lastModifiedBy: publishedData.lastModifiedBy,
          status: publishedData.status,
          publishedAt: publishedData.publishedAt,
          duration_min: publishedData.duration_min,
          difficulty: publishedData.difficulty,
          prerequisites_en: publishedData.prerequisites_en,
          prerequisites_ar: publishedData.prerequisites_ar,
          materials: publishedData.materials,
          body: publishedData.body,
          updatedAt: publishedData.updatedAt,
        })
      : await insertLegacyLessonRow(tx, {
          id: await ensureUniqueRowId(tx, baseId),
          wikiSlug: lesson.wikiSlug,
          order: publishedData.order,
          slug: publishedData.slug,
          title_en: publishedData.title_en,
          title_ar: publishedData.title_ar,
          coverImage: publishedData.coverImage,
          ownerId: publishedData.ownerId,
          lastModifiedBy: publishedData.lastModifiedBy,
          status: publishedData.status,
          publishedAt: publishedData.publishedAt,
          duration_min: publishedData.duration_min,
          difficulty: publishedData.difficulty,
          prerequisites_en: publishedData.prerequisites_en,
          prerequisites_ar: publishedData.prerequisites_ar,
          materials: publishedData.materials,
          body: publishedData.body,
          updatedAt: publishedData.updatedAt,
        })

    return {
      row,
      isUpdate: Boolean(latestPublished),
      lastPublishedAt: row.publishedAt || null,
    }
  }, { maxWait: 20000, timeout: 20000 })
}

export async function POST(req: Request) {
  try {
    const incoming = (await req.json()) as LessonPayload
    const { forceNew = false, ...rawLesson } = incoming

    const lesson: NewLesson = {
      ...rawLesson,
      order: Number(rawLesson.order) || 0,
      id: (rawLesson.id || rawLesson.slug || '').trim(),
      lessonKey: (rawLesson.lessonKey || '').trim() || undefined,
      slug: (rawLesson.slug || '').trim(),
      wikiSlug: (rawLesson.wikiSlug || 'student-kit').trim(),
      title_en: (rawLesson.title_en || rawLesson.title_ar || '').trim(),
      title_ar: (rawLesson.title_ar || rawLesson.title_en || '').trim(),
      coverImage: (rawLesson.coverImage || '').trim(),
      ownerId: rawLesson.ownerId?.trim() || undefined,
      lastModifiedBy: rawLesson.lastModifiedBy?.trim() || undefined,
      status: (rawLesson.status || '').trim() || LESSON_STATUS.DRAFT,
      publishedAt: rawLesson.publishedAt || undefined,
      duration_min: Number(rawLesson.duration_min) || 30,
      difficulty: (rawLesson.difficulty || 'Beginner').trim(),
      prerequisites_en: Array.isArray(rawLesson.prerequisites_en) ? rawLesson.prerequisites_en : [],
      prerequisites_ar: Array.isArray(rawLesson.prerequisites_ar) ? rawLesson.prerequisites_ar : [],
      materials: Array.isArray(rawLesson.materials) ? rawLesson.materials : [],
      body: Array.isArray(rawLesson.body) ? rawLesson.body : [],
      version: Number.isFinite(rawLesson.version as number) ? Number(rawLesson.version) : undefined,
    }

    if (!lesson.slug) {
      const basis = lesson.id || lesson.title_en || lesson.title_ar
      if (basis) lesson.slug = slugify(basis)
    }
    if (!lesson.id) {
      const basis = lesson.lessonKey || lesson.slug || lesson.title_en || lesson.title_ar
      if (basis) lesson.id = slugify(basis)
    }
    if (!lesson.id || lesson.id.trim() === '') {
      lesson.id = slugify(lesson.title_en || lesson.title_ar || 'untitled')
    }
    if (!lesson.slug || lesson.slug.trim() === '') {
      lesson.slug = slugify(lesson.id || lesson.title_en || lesson.title_ar || 'untitled')
    }

    const missing: string[] = []
    if (!lesson.id || lesson.id.trim() === '') missing.push('id')
    if (!lesson.slug || lesson.slug.trim() === '') missing.push('slug')
    if (!lesson.title_en || lesson.title_en.trim() === '') missing.push('title_en')
    if (!lesson.wikiSlug || lesson.wikiSlug.trim() === '') missing.push('wikiSlug')

    if (missing.length > 0) {
      return NextResponse.json({ error: 'Missing required fields', missing }, { status: 400 })
    }

    // Validate the wiki exists — check file first (fast), then DB as fallback
    // for wikis created via the API that haven't been written to wikis.json yet
    // (e.g. on Cloud Run where the filesystem is read-only).
    const wikiInFile = getWiki(lesson.wikiSlug)
    if (!wikiInFile) {
      let wikiInDb = false
      try {
        const dbWikis = await getWikisFromDb()
        wikiInDb = dbWikis.some((w) => w.slug === lesson.wikiSlug)
      } catch {
        // DB unreachable — file check is the only signal; fall through to error below
      }
      if (!wikiInDb) {
        return NextResponse.json({ error: 'Unknown wiki' }, { status: 400 })
      }
    }

    const actorId = getActorIdFromRequest(req)
    let developer = actorId ? await findDeveloperById(actorId) : undefined
    if (!developer && process.env.NODE_ENV === 'development') {
      developer = {
        id: '1',
        email: 'admin@robogeex.com',
        name: 'Local Admin',
        role: 'admin',
        password: '',
        wikiSlugs: [],
        lessonIds: [],
      }
    }
    const isAdmin = developer?.role === 'admin' || developer?.role === 'superadmin'

    if (!developer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canManageWiki(developer, lesson.wikiSlug)) {
      return NextResponse.json({ error: 'Forbidden: You are not assigned to this wiki' }, { status: 403 })
    }

    if (!lesson.ownerId && developer?.id) {
      lesson.ownerId = developer.id
    }
    if (developer?.id) {
      lesson.lastModifiedBy = developer.id
    }

    const requestedStatus = normalizeStatus(lesson.status, isAdmin)
    const clientVersion = Number.isFinite(lesson.version as number) ? Number(lesson.version) : undefined

    if (process.env.USE_DB === 'true') {
      try {
        const prisma: any = getPrisma(lesson.wikiSlug)
        const hasLessonKeyColumn = await supportsLessonKeyColumn(prisma, lesson.wikiSlug)
        if (!hasLessonKeyColumn) {
          const legacySaved = await saveLegacyLessonInDb(
            prisma,
            lesson,
            forceNew,
            developer,
            requestedStatus,
            clientVersion
          )
          return NextResponse.json({
            ok: true,
            isUpdate: legacySaved.isUpdate,
            lastPublishedAt: legacySaved.lastPublishedAt || null,
            hasUnpublishedChanges:
              legacySaved.row.status !== LESSON_STATUS.PUBLISHED && Boolean(legacySaved.lastPublishedAt),
            lesson: {
              id: legacySaved.row.id,
              lessonKey: legacySaved.row.id,
              slug: legacySaved.row.slug,
              order: legacySaved.row.order,
              coverImage: legacySaved.row.coverImage,
              ownerId: legacySaved.row.ownerId || lesson.ownerId || developer?.id || null,
              status:
                legacySaved.row.status === LESSON_STATUS.PUBLISHED || Boolean(legacySaved.lastPublishedAt)
                  ? LESSON_STATUS.PUBLISHED
                  : LESSON_STATUS.DRAFT,
              version: legacySaved.row.version,
            },
          })
        }
        const saved = await prisma.$transaction(async (tx: any) => {
          const familyResolution = await resolveLessonFamilyInDb(tx, lesson, forceNew)
          let lessonKey = familyResolution.lessonKey
          let familyRows = familyResolution.familyRows

          if (!lessonKey) {
            const rawKey =
              lesson.lessonKey ||
              (forceNew ? lesson.slug : '') ||
              lesson.id ||
              lesson.slug ||
              slugify(lesson.title_en || lesson.title_ar || 'lesson')
            lessonKey = await ensureUniqueLessonKey(tx, lesson.wikiSlug, rawKey)
            familyRows = []
          }

          const sortedFamily = sortVersionRowsDesc(familyRows)
          const latestDraft = pickLatestDraft(sortedFamily)
          const latestPublished = pickLatestPublished(sortedFamily)
          const latestAny = pickLatestAny(sortedFamily)
          const reference = latestDraft || latestPublished || latestAny

          if (reference && !canEditLesson(developer, lesson.wikiSlug, reference.ownerId)) {
            throw toApiError(403, 'Forbidden: You do not have permission to edit this lesson')
          }

          const maxVersion = sortedFamily.reduce((max, row) => Math.max(max, getVersion(row.version)), 0)
          const maxOrderResult = await tx.lesson.aggregate({
            where: { wikiSlug: lesson.wikiSlug },
            _max: { order: true },
          })
          const nextOrderFromDb = (maxOrderResult?._max?.order || 0) + 1
          const finalOrder =
            Number.isFinite(lesson.order) && lesson.order > 0
              ? Math.round(lesson.order)
              : Number.isFinite(reference?.order)
                ? Number(reference.order)
                : nextOrderFromDb

          const finalSlug = await ensureUniqueSlugForLessonKey(
            tx,
            lesson.wikiSlug,
            lesson.slug || reference?.slug || lesson.id,
            lessonKey
          )

          const finalTitleEn = (lesson.title_en || reference?.title_en || '').trim()
          const finalTitleAr = (lesson.title_ar || reference?.title_ar || finalTitleEn).trim()
          const finalDuration = Number.isFinite(lesson.duration_min) && lesson.duration_min > 0
            ? Math.round(lesson.duration_min)
            : Number.isFinite(reference?.duration_min)
              ? Number(reference.duration_min)
              : 30

          const baseData = {
            lessonKey,
            order: finalOrder,
            slug: finalSlug,
            title_en: finalTitleEn,
            title_ar: finalTitleAr,
            coverImage: lesson.coverImage || reference?.coverImage || null,
            ownerId: lesson.ownerId || reference?.ownerId || developer?.id || null,
            lastModifiedBy: lesson.lastModifiedBy || developer?.id || null,
            duration_min: finalDuration,
            difficulty: lesson.difficulty || reference?.difficulty || 'Beginner',
            prerequisites_en: Array.isArray(lesson.prerequisites_en)
              ? lesson.prerequisites_en
              : reference?.prerequisites_en || [],
            prerequisites_ar: Array.isArray(lesson.prerequisites_ar)
              ? lesson.prerequisites_ar
              : reference?.prerequisites_ar || [],
            materials: Array.isArray(lesson.materials) ? lesson.materials : reference?.materials || [],
            body: Array.isArray(lesson.body) ? lesson.body : reference?.body || [],
          }

          if (requestedStatus === LESSON_STATUS.DRAFT) {
            const lockSource = latestDraft || latestPublished || latestAny
            ensureLockAndVersionOrThrow(lockSource, clientVersion, developer?.id)

            const row = latestDraft
              ? await tx.lesson.update({
                  where: { id: latestDraft.id },
                  data: {
                    ...baseData,
                    status: LESSON_STATUS.DRAFT,
                    publishedAt: null,
                    version: getVersion(latestDraft.version) + 1,
                    updatedAt: new Date(),
                    activeEditorId: developer?.id || latestDraft.activeEditorId || null,
                    lockedUntil: latestDraft.lockedUntil || null,
                  },
                })
              : await (async () => {
                  const nextVersion = Math.max(maxVersion + 1, 1)
                  const newRowId = await ensureUniqueRowId(
                    tx,
                    lesson.id || `${lessonKey}-draft-v${nextVersion}`
                  )
                  return tx.lesson.create({
                    data: {
                      id: newRowId,
                      wikiSlug: lesson.wikiSlug,
                      ...baseData,
                      status: LESSON_STATUS.DRAFT,
                      publishedAt: null,
                      version: nextVersion,
                      activeEditorId:
                        latestPublished?.activeEditorId === developer?.id ? developer?.id : null,
                      lockedUntil:
                        latestPublished?.activeEditorId === developer?.id
                          ? latestPublished.lockedUntil || null
                          : null,
                    },
                  })
                })()

            await compactLessonFamilyRows(tx, lesson.wikiSlug, lessonKey, [
              row.id,
              latestPublished?.id,
            ])

            return {
              row,
              isUpdate: Boolean(latestDraft),
              lastPublishedAt: latestPublished?.publishedAt || null,
            }
          }

          const publishSource = latestDraft || latestPublished || latestAny
          ensureLockAndVersionOrThrow(publishSource, clientVersion, developer?.id)

          let draftSnapshot: any
          if (latestDraft) {
            draftSnapshot = await tx.lesson.update({
              where: { id: latestDraft.id },
              data: {
                ...baseData,
                status: LESSON_STATUS.DRAFT,
                publishedAt: null,
                version: getVersion(latestDraft.version) + 1,
                updatedAt: new Date(),
                activeEditorId: developer?.id || latestDraft.activeEditorId || null,
                lockedUntil: latestDraft.lockedUntil || null,
              },
            })
          } else {
            const nextDraftVersion = Math.max(maxVersion + 1, 1)
            const draftId = await ensureUniqueRowId(
              tx,
              lesson.id || `${lessonKey}-draft-v${nextDraftVersion}`
            )
            draftSnapshot = await tx.lesson.create({
              data: {
                id: draftId,
                wikiSlug: lesson.wikiSlug,
                ...baseData,
                status: LESSON_STATUS.DRAFT,
                publishedAt: null,
                version: nextDraftVersion,
                activeEditorId: developer?.id || null,
                lockedUntil: null,
              },
            })
          }

          const now = new Date()
          const nextPublishedVersion =
            Math.max(getVersion(latestPublished?.version), getVersion(draftSnapshot.version)) + 1
          const publishedData = {
            ...baseData,
            status: LESSON_STATUS.PUBLISHED,
            publishedAt: now,
            version: nextPublishedVersion,
            activeEditorId: null,
            lockedUntil: null,
          }

          const published = latestPublished
            ? await tx.lesson.update({
                where: { id: latestPublished.id },
                data: publishedData,
              })
            : await tx.lesson.create({
                data: {
                  id: await ensureUniqueRowId(tx, `${lessonKey}-published`),
                  wikiSlug: lesson.wikiSlug,
                  ...publishedData,
                },
              })

          await compactLessonFamilyRows(tx, lesson.wikiSlug, lessonKey, [
            draftSnapshot.id,
            published.id,
          ])

          return {
            row: published,
            isUpdate: Boolean(latestPublished),
            lastPublishedAt: published.publishedAt || null,
          }
        }, { maxWait: 20000, timeout: 20000 })

        return NextResponse.json({
          ok: true,
          isUpdate: saved.isUpdate,
          lastPublishedAt: saved.lastPublishedAt || null,
          hasUnpublishedChanges:
            saved.row.status !== LESSON_STATUS.PUBLISHED && Boolean(saved.lastPublishedAt),
          lesson: {
            id: saved.row.id,
            lessonKey: saved.row.lessonKey || saved.row.id,
            slug: saved.row.slug,
            order: saved.row.order,
            coverImage: saved.row.coverImage,
            ownerId: saved.row.ownerId || lesson.ownerId || developer?.id || null,
            status:
              saved.row.status === LESSON_STATUS.PUBLISHED || Boolean(saved.lastPublishedAt)
                ? LESSON_STATUS.PUBLISHED
                : LESSON_STATUS.DRAFT,
            version: saved.row.version,
          },
        })
      } catch (error: any) {
        if (isApiError(error)) {
          const { status, ...body } = error
          return NextResponse.json(body, { status })
        }
        if (isLegacyLessonReadSchemaError(error)) {
          try {
            const prisma: any = getPrisma(lesson.wikiSlug)
            const legacySaved = await saveLegacyLessonInDb(
              prisma,
              lesson,
              forceNew,
              developer,
              requestedStatus,
              clientVersion
            )
            return NextResponse.json({
              ok: true,
              isUpdate: legacySaved.isUpdate,
              lastPublishedAt: legacySaved.lastPublishedAt || null,
              hasUnpublishedChanges:
                legacySaved.row.status !== LESSON_STATUS.PUBLISHED && Boolean(legacySaved.lastPublishedAt),
              lesson: {
                id: legacySaved.row.id,
                lessonKey: legacySaved.row.id,
                slug: legacySaved.row.slug,
                order: legacySaved.row.order,
                coverImage: legacySaved.row.coverImage,
                ownerId: legacySaved.row.ownerId || lesson.ownerId || developer?.id || null,
                status:
                  legacySaved.row.status === LESSON_STATUS.PUBLISHED || Boolean(legacySaved.lastPublishedAt)
                    ? LESSON_STATUS.PUBLISHED
                    : LESSON_STATUS.DRAFT,
                version: legacySaved.row.version,
              },
            })
          } catch (legacyError: any) {
            if (isApiError(legacyError)) {
              const { status, ...body } = legacyError
              return NextResponse.json(body, { status })
            }
            return NextResponse.json({ error: legacyError?.message || 'DB error' }, { status: 500 })
          }
        }
        if (error?.code === 'P2002') {
          const target = error.meta?.target || []
          const fields = Array.isArray(target) ? target.join(', ') : 'unknown field'
          return NextResponse.json({ error: `A lesson with this ${fields} already exists.` }, { status: 409 })
        }
        return NextResponse.json({ error: error?.message || 'DB error' }, { status: 500 })
      }
    }

    try {
      const list = await readLessonsFromFile(lesson.wikiSlug)
      const resolved = resolveLessonFamilyInFile(list, lesson)
      let lessonKey = resolved.lessonKey
      let family = resolved.family

      if (!lessonKey || forceNew) {
        const desired = lesson.lessonKey || lesson.id || lesson.slug || slugify(lesson.title_en || lesson.title_ar || 'lesson')
        let candidate = desired
        let counter = 1
        while (list.some((item) => (item.lessonKey || item.id) === candidate)) {
          candidate = `${desired}-${counter++}`
        }
        lessonKey = candidate
        family = []
      }

      const sortedFamily = sortVersionRowsDesc(family)
      const latestDraft = pickLatestDraft(sortedFamily)
      const latestPublished = pickLatestPublished(sortedFamily)
      const latestAny = pickLatestAny(sortedFamily)
      const reference = latestDraft || latestPublished || latestAny

      if (reference && !canEditLesson(developer, lesson.wikiSlug, reference.ownerId)) {
        return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this lesson' }, { status: 403 })
      }

      const desiredStatus = normalizeStatus(lesson.status, isAdmin)
      const maxVersion = sortedFamily.reduce((max, row) => Math.max(max, getVersion(row.version)), 0)
      const maxOrder = list.reduce((max, row) => Math.max(max, Number(row.order) || 0), 0)
      let lastPublishedAt = latestPublished?.publishedAt || null
      const finalOrder =
        Number.isFinite(lesson.order) && lesson.order > 0
          ? Math.round(lesson.order)
          : Number.isFinite(reference?.order)
            ? Number(reference.order)
            : maxOrder + 1

      const finalSlug = ensureUniqueFileSlug(
        list,
        lesson.wikiSlug,
        lessonKey,
        lesson.slug || reference?.slug || lesson.id
      )

      const baseData: NewLesson = {
        ...lesson,
        id: lesson.id,
        lessonKey,
        wikiSlug: lesson.wikiSlug,
        order: finalOrder,
        slug: finalSlug,
        title_en: lesson.title_en || reference?.title_en || '',
        title_ar: lesson.title_ar || reference?.title_ar || lesson.title_en || '',
        coverImage: lesson.coverImage || reference?.coverImage || '',
        ownerId: lesson.ownerId || reference?.ownerId || developer?.id || undefined,
        lastModifiedBy: developer?.id || lesson.lastModifiedBy || reference?.lastModifiedBy,
        duration_min:
          Number.isFinite(lesson.duration_min) && lesson.duration_min > 0
            ? Math.round(lesson.duration_min)
            : Number(reference?.duration_min) || 30,
        difficulty: lesson.difficulty || reference?.difficulty || 'Beginner',
        prerequisites_en: Array.isArray(lesson.prerequisites_en)
          ? lesson.prerequisites_en
          : reference?.prerequisites_en || [],
        prerequisites_ar: Array.isArray(lesson.prerequisites_ar)
          ? lesson.prerequisites_ar
          : reference?.prerequisites_ar || [],
        materials: Array.isArray(lesson.materials) ? lesson.materials : reference?.materials || [],
        body: Array.isArray(lesson.body) ? lesson.body : reference?.body || [],
        status: desiredStatus,
        publishedAt: lesson.publishedAt,
      }

      let savedRow: NewLesson
      let isUpdate = false

      if (desiredStatus === LESSON_STATUS.DRAFT) {
        const row = latestDraft
          ? (() => {
              const index = list.findIndex((item) => item.id === latestDraft.id)
              const updated: NewLesson = {
                ...latestDraft,
                ...baseData,
                status: LESSON_STATUS.DRAFT,
                publishedAt: undefined,
                version: getVersion(latestDraft.version) + 1,
              }
              if (index >= 0) list[index] = updated
              return updated
            })()
          : (() => {
              const nextVersion = Math.max(maxVersion + 1, 1)
              const id = ensureUniqueFileRowId(list, lesson.id || `${lessonKey}-draft-v${nextVersion}`)
              const created: NewLesson = {
                ...baseData,
                id,
                lessonKey,
                status: LESSON_STATUS.DRAFT,
                publishedAt: undefined,
                version: nextVersion,
              }
              list.push(created)
              return created
            })()

        const compacted = compactLessonFamilyInFile(list, lessonKey, [
          row.id,
          latestPublished?.id,
        ])
        list.length = 0
        list.push(...compacted)
        savedRow = row
        isUpdate = Boolean(latestDraft)
      } else {
        let draftSnapshot: NewLesson
        if (latestDraft) {
          const index = list.findIndex((row) => row.id === latestDraft.id)
          draftSnapshot = {
            ...latestDraft,
            ...baseData,
            status: LESSON_STATUS.DRAFT,
            publishedAt: undefined,
            version: getVersion(latestDraft.version) + 1,
          }
          if (index >= 0) list[index] = draftSnapshot
        } else {
          const nextDraftVersion = Math.max(maxVersion + 1, 1)
          draftSnapshot = {
            ...baseData,
            id: ensureUniqueFileRowId(list, lesson.id || `${lessonKey}-draft-v${nextDraftVersion}`),
            lessonKey,
            status: LESSON_STATUS.DRAFT,
            publishedAt: undefined,
            version: nextDraftVersion,
          }
          list.push(draftSnapshot)
        }

        const nextPublishedVersion =
          Math.max(getVersion(latestPublished?.version), getVersion(draftSnapshot.version)) + 1
        const publishedAt = new Date().toISOString()
        const published: NewLesson = latestPublished
          ? (() => {
              const index = list.findIndex((row) => row.id === latestPublished.id)
              const updated: NewLesson = {
                ...latestPublished,
                ...draftSnapshot,
                id: latestPublished.id,
                lessonKey,
                status: LESSON_STATUS.PUBLISHED,
                publishedAt,
                version: nextPublishedVersion,
              }
              if (index >= 0) list[index] = updated
              else list.push(updated)
              return updated
            })()
          : (() => {
              const created: NewLesson = {
                ...draftSnapshot,
                id: ensureUniqueFileRowId(list, `${lessonKey}-published`),
                lessonKey,
                status: LESSON_STATUS.PUBLISHED,
                publishedAt,
                version: nextPublishedVersion,
              }
              list.push(created)
              return created
            })()

        const compacted = compactLessonFamilyInFile(list, lessonKey, [
          draftSnapshot.id,
          published.id,
        ])
        list.length = 0
        list.push(...compacted)
        savedRow = published
        isUpdate = Boolean(latestPublished)
        lastPublishedAt = published.publishedAt || null
      }

      const ordered = sortLessons(list)
      const filePath = lessonsFilePath(lesson.wikiSlug)
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(filePath, JSON.stringify(ordered, null, 2), 'utf-8')

      return NextResponse.json({
        ok: true,
        isUpdate,
        lastPublishedAt: lastPublishedAt || null,
        hasUnpublishedChanges:
          savedRow.status !== LESSON_STATUS.PUBLISHED && Boolean(lastPublishedAt),
        lesson: {
          id: savedRow.id,
          lessonKey: savedRow.lessonKey || savedRow.id,
          slug: savedRow.slug,
          order: savedRow.order,
          ownerId: savedRow.ownerId || developer?.id || null,
          status:
            savedRow.status === LESSON_STATUS.PUBLISHED || Boolean(lastPublishedAt)
              ? LESSON_STATUS.PUBLISHED
              : LESSON_STATUS.DRAFT,
          version: savedRow.version || 1,
        },
      })
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Failed to save lessons', details: error?.message || String(error) },
        { status: 500 }
      )
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const wikiSlug = searchParams.get('wiki') || searchParams.get('kit') || 'student-kit'

    const actorId = getActorIdFromRequest(req)
    const developer = actorId ? await findDeveloperById(actorId) : undefined
    const canSeeDrafts = !!developer && canManageWiki(developer, wikiSlug)
    const publishedOnly = !canSeeDrafts

    if (process.env.USE_DB !== 'true') {
      return NextResponse.json(
        { error: `Lesson file fallback is disabled. Enable database access for wiki "${wikiSlug}".` },
        { status: 503 }
      )
    }

    if (shouldBypassDb(wikiSlug)) {
      return NextResponse.json(
        { error: `Database access is temporarily unavailable for wiki "${wikiSlug}".` },
        { status: 503 }
      )
    }

    try {
      const prisma: any = getPrisma(wikiSlug || undefined)
      let lessons: any[]
      try {
        lessons = await withDbTimeout(() =>
          prisma.lesson.findMany({
            where: {
              wikiSlug,
              ...(publishedOnly ? { status: LESSON_STATUS.PUBLISHED } : {}),
            },
            orderBy: [{ order: 'asc' }, { version: 'desc' }],
            select: lessonListSelect,
          })
        )
      } catch (error: any) {
        if (!isLegacyLessonReadSchemaError(error)) throw error
        const legacyRows: any[] = await withDbTimeout(() =>
          prisma.lesson.findMany({
            where: {
              wikiSlug,
              ...(publishedOnly ? { status: LESSON_STATUS.PUBLISHED } : {}),
            },
            orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
            select: legacyLessonListSelect,
          })
        )
        lessons = legacyRows.map(mapLegacyLessonRow)
      }

      const collapsed = publishedOnly
        ? collapseLessonsForPublic(lessons)
        : collapseLessonsForEditor(lessons)
      const enriched = enrichLessonsWithPublishState(lessons, collapsed, publishedOnly)

      markDbSuccess(wikiSlug)
      return NextResponse.json(enriched)
    } catch (error: any) {
      markDbFailure(wikiSlug)
      console.error(`[api/lessons] DB read failed for "${wikiSlug}".`, error)
      return NextResponse.json(
        { error: error?.message || `Failed to load lessons from database for wiki "${wikiSlug}".` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load lessons' }, { status: 500 })
  }
}
