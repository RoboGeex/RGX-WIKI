// Server-only helpers to fetch from DB when USE_DB=true
import type { Lesson, Wiki } from '@/lib/types'
import { getPrisma } from '@/lib/prisma-multi'
import { LESSON_STATUS, collapseLessonsForEditor, collapseLessonsForPublic, getLessonKey, groupLessonsByKey, hasLessonContentChanges, pickLatestDraft, pickLatestPublished } from '@/lib/lesson-versions'

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

function mapLegacyLessonRow(row: any): Lesson {
  const normalizedLessonKey =
    row.lessonKey ||
    getLessonKey({ id: row.id || '', lessonKey: row.lessonKey || null, slug: row.slug || null } as any)
  return {
    ...row,
    lessonKey: normalizedLessonKey,
  } as Lesson
}

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

function enrichLessonsWithPublishState(rows: Lesson[], collapsed: Lesson[], publishedOnly?: boolean): Lesson[] {
  if (publishedOnly) return collapsed

  const toIsoDate = (value: unknown): string => {
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

  const grouped = groupLessonsByKey(rows)
  return collapsed.map((lesson) => {
    const versions = grouped.get(lesson.lessonKey || lesson.id) || []
    const latestDraft = pickLatestDraft(versions)
    const latestPublished = pickLatestPublished(versions)
    const lastPublishedAt = toIsoDate((latestPublished as any)?.publishedAt)
    return {
      ...lesson,
      lastPublishedAt,
      hasUnpublishedChanges:
        lesson.status === LESSON_STATUS.DRAFT &&
        Boolean(latestDraft) &&
        Boolean(latestPublished) &&
        hasLessonContentChanges(latestDraft, latestPublished),
    }
  })
}

export function syncGetLessons(kitSlug: string): Lesson[] {
  throw new Error('syncGetLessons is not usable in sync context. Use API or refactor to async.')
}

export async function getLessonsFromDb(
  wikiSlug?: string,
  opts?: { publishedOnly?: boolean }
): Promise<Lesson[]> {
  if (process.env.USE_DB !== 'true') {
    return []
  }

  const prisma: any = getPrisma(wikiSlug)
  let rows: Lesson[]
  try {
    rows = await prisma.lesson.findMany({
      where: wikiSlug
        ? {
            wikiSlug,
            ...(opts?.publishedOnly ? { status: LESSON_STATUS.PUBLISHED } : {}),
          }
        : (opts?.publishedOnly ? { status: LESSON_STATUS.PUBLISHED } : undefined),
      orderBy: [{ order: 'asc' }, { version: 'desc' }],
      select: lessonListSelect,
    })
  } catch (error: any) {
    if (!isLessonKeyUnsupportedError(error)) throw error
    const legacyRows = await prisma.lesson.findMany({
      where: wikiSlug
        ? {
            wikiSlug,
            ...(opts?.publishedOnly ? { status: LESSON_STATUS.PUBLISHED } : {}),
          }
        : (opts?.publishedOnly ? { status: LESSON_STATUS.PUBLISHED } : undefined),
      orderBy: [{ order: 'asc' }, { version: 'desc' }],
      select: legacyLessonListSelect,
    })
    rows = legacyRows.map(mapLegacyLessonRow)
  }
  const collapsed = opts?.publishedOnly
    ? collapseLessonsForPublic(rows as Lesson[])
    : collapseLessonsForEditor(rows as Lesson[])
  return enrichLessonsWithPublishState(rows as Lesson[], collapsed as Lesson[], opts?.publishedOnly) as Lesson[]
}

export async function getLessonVersionRowsFromDb(wikiSlug?: string): Promise<Lesson[]> {
  if (process.env.USE_DB !== 'true') {
    return []
  }

  const prisma: any = getPrisma(wikiSlug)
  try {
    return await prisma.lesson.findMany({
      where: wikiSlug ? { wikiSlug } : undefined,
      orderBy: [{ order: 'asc' }, { version: 'desc' }],
      select: lessonListSelect,
    })
  } catch (error: any) {
    if (!isLessonKeyUnsupportedError(error)) throw error
    const legacyRows = await prisma.lesson.findMany({
      where: wikiSlug ? { wikiSlug } : undefined,
      orderBy: [{ order: 'asc' }, { version: 'desc' }],
      select: legacyLessonListSelect,
    })
    return legacyRows.map(mapLegacyLessonRow)
  }
}

export async function getLessonBySlug(slug: string, wikiSlug?: string): Promise<Lesson | undefined> {
  if (process.env.USE_DB !== 'true') {
    return undefined
  }

  const prisma: any = getPrisma(wikiSlug)
  let matched: any
  try {
    matched = await prisma.lesson.findFirst({
      where: {
        ...(wikiSlug ? { wikiSlug } : {}),
        OR: [{ slug }, { id: slug }, { lessonKey: slug }],
      },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
    })
  } catch (error: any) {
    if (!isLessonKeyUnsupportedError(error)) throw error
    matched = await prisma.lesson.findFirst({
      where: {
        ...(wikiSlug ? { wikiSlug } : {}),
        OR: [{ slug }, { id: slug }],
      },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
    })
  }
  if (!matched) return undefined

  try {
    const lessonKey = getLessonKey(matched)
    const rows = await prisma.lesson.findMany({
      where: {
        ...(wikiSlug ? { wikiSlug } : {}),
        lessonKey,
        status: LESSON_STATUS.PUBLISHED,
      },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
    })
    const published = collapseLessonsForPublic(rows as Lesson[])[0]
    if (published) return published as Lesson
    return undefined
  } catch (error: any) {
    if (!isLessonKeyUnsupportedError(error)) throw error
    const published = await prisma.lesson.findFirst({
      where: {
        ...(wikiSlug ? { wikiSlug } : {}),
        OR: [{ slug }, { id: slug }],
        status: LESSON_STATUS.PUBLISHED,
      },
      orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
    })
    return published as Lesson | undefined
  }
}

// Fetch a SINGLE lesson row (including drafts) with its full body, for preview.
// Unlike getLessonBySlug this does not filter to published, and it never pulls
// every lesson's body — preview only needs the one lesson being previewed, so
// this stays cheap even on large wikis.
export async function getPreviewLesson(idOrSlug: string, wikiSlug?: string): Promise<Lesson | undefined> {
  if (process.env.USE_DB !== 'true') return undefined
  const key = (idOrSlug || '').trim()
  if (!key) return undefined

  const prisma: any = getPrisma(wikiSlug)
  const order = [{ version: 'desc' as const }, { updatedAt: 'desc' as const }]
  const exact = await prisma.lesson.findUnique({ where: { id: key } })
  if (exact && (!wikiSlug || exact.wikiSlug === wikiSlug)) {
    return exact as Lesson
  }

  try {
    const matched = await prisma.lesson.findFirst({
      where: {
        ...(wikiSlug ? { wikiSlug } : {}),
        OR: [{ slug: key }, { lessonKey: key }],
      },
      orderBy: order,
      select: { id: true },
    })
    if (!matched?.id) return undefined
    const full = await prisma.lesson.findUnique({ where: { id: matched.id } })
    return (full as Lesson) || undefined
  } catch (error: any) {
    if (!isLessonKeyUnsupportedError(error)) throw error
    const matched = await prisma.lesson.findFirst({
      where: {
        ...(wikiSlug ? { wikiSlug } : {}),
        slug: key,
      },
      orderBy: order,
      select: { id: true },
    })
    if (!matched?.id) return undefined
    const full = await prisma.lesson.findUnique({ where: { id: matched.id } })
    return (full as Lesson) || undefined
  }
}

type WikiRow = {
  slug: string
  displayName: string
  grade: string | null
  picture: string | null
  isPublished: number | boolean | null
  domains: unknown
  tags: unknown
  defaultLocale: string | null
  defaultLessonSlug: string | null
  resourcesUrl: string | null
  createdAt: Date | string | null
}

function parseWikiDomains(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string')
      }
    } catch {
      // ignore parse failure
    }
  }
  return []
}

function parseWikiTags(value: unknown): string[] {
  return parseWikiDomains(value)
}

const wikiTableEnsured = new WeakSet<object>()

async function ensureWikiTableOnce(prisma: any): Promise<void> {
  if (wikiTableEnsured.has(prisma)) return
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Wiki (
      slug VARCHAR(191) NOT NULL,
      displayName VARCHAR(255) NOT NULL,
      grade VARCHAR(191) NULL,
      picture TEXT NULL,
      isPublished BOOLEAN NOT NULL DEFAULT TRUE,
      domains JSON NULL,
      tags JSON NULL,
      defaultLocale VARCHAR(16) NULL,
      defaultLessonSlug VARCHAR(191) NULL,
      resourcesUrl VARCHAR(255) NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (slug)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `)
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE Wiki
      ADD COLUMN IF NOT EXISTS isPublished BOOLEAN NOT NULL DEFAULT TRUE;
    `)
  } catch {
    // Column might already exist or server may not support IF NOT EXISTS.
  }
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE Wiki
      ADD COLUMN IF NOT EXISTS tags JSON NULL;
    `)
  } catch {
    // Column might already exist or server may not support IF NOT EXISTS.
  }
  wikiTableEnsured.add(prisma)
}

export async function getWikisFromDb(): Promise<Wiki[]> {
  if (process.env.USE_DB !== 'true') {
    return []
  }

  try {
    const prisma: any = getPrisma()
    await ensureWikiTableOnce(prisma)
    const rows = (await prisma.$queryRawUnsafe(`
      SELECT slug, displayName, grade, picture, isPublished, domains, tags, defaultLocale, defaultLessonSlug, resourcesUrl, createdAt
      FROM Wiki
      ORDER BY createdAt ASC
    `)) as WikiRow[]

    return rows.map((row) => ({
      slug: row.slug,
      displayName: row.displayName,
      grade: row.grade || 'All Levels',
      picture: row.picture || '',
      isPublished: row.isPublished == null ? true : Boolean(row.isPublished),
      domains: parseWikiDomains(row.domains),
      tags: parseWikiTags(row.tags),
      defaultLocale: row.defaultLocale || 'en',
      defaultLessonSlug: row.defaultLessonSlug || 'getting-started',
      resourcesUrl: row.resourcesUrl || '/resources',
    }))
  } catch {
    return []
  }
}
