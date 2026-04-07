import fs from 'fs'
import path from 'path'
import os from 'os'
import { Wiki, Kit, Material, Module, LessonBodyItem, Lesson } from '@/lib/types';
import kitsData from '@/data/kits.json'
import wikisData from '@/data/wikis.json'
import { getPrisma } from '@/lib/prisma-multi'
import { LESSON_STATUS, collapseLessonsForEditor, collapseLessonsForPublic, groupLessonsByKey, hasLessonContentChanges, pickLatestDraft, pickLatestPublished } from '@/lib/lesson-versions'

const LEGACY_LESSON_OPTIONAL_COLUMNS = ['lessonkey', 'version', 'activeeditorid', 'lockeduntil'] as const

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

function isLegacyLessonSchemaError(error: any): boolean {
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
  const unknownPrismaField = ['lessonKey', 'version', 'activeEditorId', 'lockedUntil'].some(
    (column) => message.includes(`Unknown argument \`${column}\``) || message.includes(`Unknown field \`${column}\``)
  )

  return (missingColumnHint && mentionsLegacyColumn) || prismaMetaColumn || unknownPrismaField
}

function mapLegacyLessonRow(row: any): Lesson {
  const normalizedLessonKey =
    row.lessonKey ||
    stripLegacyDraftSuffix(row.id || '') ||
    stripLegacyDraftSuffix(row.slug || '') ||
    row.id
  return {
    ...row,
    lessonKey: normalizedLessonKey,
    version: Number.isFinite(row?.version) ? Number(row.version) : 0,
    activeEditorId: row?.activeEditorId || null,
    lockedUntil: row?.lockedUntil || null,
  } as Lesson
}

function loadJsonFile<T>(file: string, fallback: T): T {
  const tmpPath = path.join(os.tmpdir(), file)
  const repoPath = path.join(process.cwd(), 'data', file)
  for (const p of [tmpPath, repoPath]) {
    try {
      const raw = fs.readFileSync(p, 'utf-8')
      return JSON.parse(raw) as T
    } catch {
      // ignore and fall through
    }
  }
  return fallback
}

function loadWikis(): Wiki[] {
  return loadJsonFile<Wiki[]>('wikis.json', wikisData as Wiki[])
}

function loadKits(): Kit[] {
  return loadJsonFile<Kit[]>('kits.json', kitsData as Kit[])
}

function createKitFromWiki(wiki: Wiki): Kit {
  const displayName = wiki.displayName || wiki.slug
  const overview = wiki.grade
    ? `${wiki.grade} level learning content for ${displayName}.`
    : `Learning content for ${displayName}.`
  return {
    slug: wiki.slug,
    wikiSlug: wiki.slug,
    title_en: displayName,
    title_ar: displayName,
    heroImage: wiki.picture || '/images/robogeex-logo.png',
    overview_en: overview,
    overview_ar: overview,
  }
}

function wikiSlugForKit(kitSlug: string): string {
  const kit = loadKits().find(k => k.slug === kitSlug)
  return kit?.wikiSlug || kitSlug
}

const normalizeSlug = (s: string) => s.replace(/_/g, '-')
const LEGACY_DRAFT_SUFFIX = '--draft'

function stripLegacyDraftSuffix(value: string): string {
  const normalized = normalizeSlug(value || '')
  if (normalized.endsWith(LEGACY_DRAFT_SUFFIX)) {
    return normalized.slice(0, normalized.length - LEGACY_DRAFT_SUFFIX.length)
  }
  return normalized
}

function ensureResourcesLesson(list: Lesson[], wikiSlug: string): Lesson[] {
  const hasResources = list.some((lesson) => normalizeSlug(lesson.slug || '') === 'resources')
  if (hasResources) return list

  const maxOrder = list.reduce((max, lesson) => Math.max(max, Number(lesson.order) || 0), 0)
  const resources: Lesson = {
    id: 'resources',
    lessonKey: 'resources',
    wikiSlug,
    order: maxOrder + 1,
    slug: 'resources',
    title_en: 'Resources',
    title_ar: 'الموارد',
    status: LESSON_STATUS.PUBLISHED,
    publishedAt: new Date(0).toISOString(),
    duration_min: 15,
    difficulty: 'Beginner',
    prerequisites_en: [],
    prerequisites_ar: [],
    materials: [],
    body: [
      { type: 'heading', en: 'Resources', ar: 'الموارد', level: 1 },
      { type: 'paragraph', en: 'Resources are coming soon.', ar: 'الموارد قادمة قريباً.' },
    ],
  }
  return [...list, resources]
}

function enrichLessonsWithPublishState(rows: Lesson[], collapsed: Lesson[], includeDrafts: boolean): Lesson[] {
  if (!includeDrafts) return collapsed

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

export function getWikis(): Wiki[] { return loadWikis() }

export function getWiki(slug: string) {
  const normalized = normalizeSlug(slug)
  const wiki = loadWikis().find(w => w.slug === normalized);
  if (wiki) {
    return wiki;
  }
  // If no wiki is found by slug, try to find by kit slug
  const wikiSlug = wikiSlugForKit(normalized);
  return loadWikis().find(w => w.slug === wikiSlug);
}

export function getWikiByDomain(host?: string | null) {
  const normalised = host?.split(':')[0].toLowerCase()
  if (!normalised) return undefined
  return loadWikis().find(w => (w.domains || []).map(d => d.toLowerCase()).includes(normalised))
}
export function getKits(wikiSlug?: string): Kit[] {
  const kits = loadKits()
  if (wikiSlug) {
    const matches = kits.filter(k => k.wikiSlug === wikiSlug)
    if (matches.length > 0) return matches
    const wiki = getWiki(wikiSlug)
    if (wiki) return [createKitFromWiki(wiki)]
    return []
  }
  return kits
}

export function getKit(slug: string, wikiSlug?: string) {
  // If a wikiSlug is provided, find the exact kit for that wiki.
  const kits = loadKits()
  const normSlug = normalizeSlug(slug)
  const normWiki = wikiSlug ? normalizeSlug(wikiSlug) : undefined

  if (normWiki) {
    return kits.find(k => k.slug === normSlug && k.wikiSlug === normWiki);
  }
  // Otherwise, just find the first kit with the given slug.
  const found = kits.find(k => k.slug === normSlug);
  if (found) return found
  const wiki = getWiki(normSlug) || (normWiki ? getWiki(normWiki) : undefined)
  if (wiki) return createKitFromWiki(wiki)
  return undefined;
}

export async function getLessons(kitSlug: string, opts?: { includeDrafts?: boolean }): Promise<Lesson[]> {
  try {
    const normKit = normalizeSlug(kitSlug)
    const wikiSlug = wikiSlugForKit(normKit)
    const includeDrafts = opts?.includeDrafts === true
    const prisma: any = getPrisma(wikiSlug)
    let rows: Lesson[]
    try {
      rows = await prisma.lesson.findMany({
        where: {
          wikiSlug,
          ...(includeDrafts ? {} : { status: LESSON_STATUS.PUBLISHED }),
        },
        orderBy: [{ order: 'asc' }, { version: 'desc' }],
      })
    } catch (error: any) {
      if (!isLegacyLessonSchemaError(error)) throw error
      const legacyRows = await prisma.lesson.findMany({
        where: {
          wikiSlug,
          ...(includeDrafts ? {} : { status: LESSON_STATUS.PUBLISHED }),
        },
        orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
        select: legacyLessonReadSelect,
      })
      rows = legacyRows.map(mapLegacyLessonRow)
    }
    const collapsed = includeDrafts
      ? collapseLessonsForEditor(rows as Lesson[])
      : collapseLessonsForPublic(rows as Lesson[])
    const enriched = enrichLessonsWithPublishState(rows as Lesson[], collapsed as Lesson[], includeDrafts)
    return ensureResourcesLesson(enriched as Lesson[], wikiSlug)
  } catch (e) {
    console.error("Failed to fetch lessons from db", e)
    return []
  }
}


export function getModules(wikiSlug: string): any[] {
    return []
}

export async function getLesson(
  kit: string,
  lessonSlug: string,
  opts?: { includeDrafts?: boolean }
): Promise<Lesson | undefined> {
  const lessons = await getLessons(kit, opts)
  const rawSlug = (lessonSlug || '').trim()
  const normSlug = normalizeSlug(rawSlug)
  const baseSlug = stripLegacyDraftSuffix(normSlug)
  const draftSlug = `${baseSlug}${LEGACY_DRAFT_SUFFIX}`

  const candidates = new Set<string>([rawSlug, normSlug])
  if (opts?.includeDrafts) {
    candidates.add(baseSlug)
    candidates.add(draftSlug)
  }

  return lessons.find((l) => {
    const lessonSlugNorm = normalizeSlug(l.slug || '')
    const lessonIdNorm = normalizeSlug(l.id || '')
    return candidates.has(lessonSlugNorm) || candidates.has(lessonIdNorm)
  })
}

function sortLessons(list: Lesson[]): Lesson[] {
  return list.slice().sort((a, b) => (a.order || 0) - (b.order || 0))
}

export async function getFirstLesson(kitSlug: string): Promise<Lesson | undefined> {
  const lessons = await getLessons(kitSlug)
  const wikiSlug = wikiSlugForKit(kitSlug)
  const wiki = getWiki(wikiSlug)
  
  if (wiki?.defaultLessonSlug) {
    const defaultLesson = lessons.find(l => l.slug === wiki.defaultLessonSlug)
    if (defaultLesson) return defaultLesson
  }

  const list = sortLessons(lessons)
  return list[0]
}

export async function getNextLesson(
  kit: string,
  slug: string,
  opts?: { includeDrafts?: boolean }
): Promise<Lesson | undefined> {
  const lessons = await getLessons(kit, opts)
  const list = sortLessons(lessons)
  const idx = list.findIndex(l => l.slug === slug)
  if (idx >= 0 && idx < list.length - 1) return list[idx + 1]
}

export async function getPrevLesson(
  kit: string,
  slug: string,
  opts?: { includeDrafts?: boolean }
): Promise<Lesson | undefined> {
  const lessons = await getLessons(kit, opts)
  const list = sortLessons(lessons)
  const idx = list.findIndex(l => l.slug === slug)
  if (idx > 0) return list[idx - 1]
}
