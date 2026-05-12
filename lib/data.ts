import fs from 'fs'
import path from 'path'
import os from 'os'
import { Wiki, Kit, Material, Module, LessonBodyItem, Lesson } from '@/lib/types';
import kitsData from '@/data/kits.json'
import wikisData from '@/data/wikis.json'
import { getPrisma } from '@/lib/prisma-multi'
import { LESSON_STATUS, collapseLessonsForEditor, collapseLessonsForPublic, groupLessonsByKey, hasLessonContentChanges, pickLatestDraft, pickLatestPublished } from '@/lib/lesson-versions'
import { normalizeSlug, stripLegacyDraftSuffix, LEGACY_DRAFT_SUFFIX, DEFAULT_LESSON_SLUG, RESOURCES_LESSON_SLUG } from './wikiPaths'
import { HUB_DOMAIN } from '@/lib/domains'
import { markDbFailure, markDbSuccess, shouldBypassDb, withDbTimeout } from '@/lib/db-fallback'

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
  const repoPath = path.join(process.cwd(), 'data', file)
  const tmpPath = path.join(os.tmpdir(), file)

  // In hosted environments (for example Vercel), /tmp can contain stale artifacts
  // from previous invocations. Prefer repository data first, then tmp as fallback.
  for (const p of [repoPath, tmpPath]) {
    try {
      const raw = fs.readFileSync(p, 'utf-8')
      return JSON.parse(raw) as T
    } catch {
      // ignore and fall through
    }
  }
  return fallback
}

const REMOTE_LESSON_CACHE_TTL_MS = 60 * 1000
const remoteLessonsCache = new Map<string, { expiresAt: number; lessons: Lesson[] }>()

function getFallbackApiBaseUrl(): string {
  const configured = (process.env.LESSONS_FALLBACK_API_BASE_URL || '').trim()
  if (configured) return configured
  return HUB_DOMAIN ? `https://${HUB_DOMAIN}` : ''
}

function normalizeLessonFromRemote(lesson: any, wikiSlug: string): Lesson {
  return {
    ...lesson,
    id: String(lesson?.id || lesson?.slug || ''),
    lessonKey: String(lesson?.lessonKey || lesson?.id || lesson?.slug || ''),
    slug: String(lesson?.slug || lesson?.id || ''),
    wikiSlug: String(lesson?.wikiSlug || wikiSlug),
    order: Number.isFinite(Number(lesson?.order)) ? Number(lesson.order) : 0,
    status: typeof lesson?.status === 'string' ? lesson.status : LESSON_STATUS.PUBLISHED,
  } as Lesson
}

function normalizeLessonIdentity(lesson: Pick<Lesson, 'slug' | 'id' | 'lessonKey'>): string {
  return normalizeSlug(stripLegacyDraftSuffix(lesson.slug || lesson.lessonKey || lesson.id || ''))
}

function isSpecialLesson(lesson: Pick<Lesson, 'slug' | 'id' | 'lessonKey'>): boolean {
  const identity = normalizeLessonIdentity(lesson)
  return identity === DEFAULT_LESSON_SLUG || identity === RESOURCES_LESSON_SLUG
}

function hasNonSpecialLessons(rows: Lesson[]): boolean {
  return rows.some((lesson) => !isSpecialLesson(lesson))
}

function hasRenderableBody(lesson: Lesson): boolean {
  if (!Array.isArray(lesson.body) || lesson.body.length === 0) return false
  return lesson.body.some((block: any) => {
    if (!block || typeof block !== 'object') return false
    if (typeof block.en === 'string' && block.en.trim()) return true
    if (typeof block.ar === 'string' && block.ar.trim()) return true
    if (typeof block.html_en === 'string' && block.html_en.trim()) return true
    if (typeof block.html_ar === 'string' && block.html_ar.trim()) return true
    if (Array.isArray(block.items_en) && block.items_en.some((item: any) => typeof item === 'string' && item.trim())) return true
    if (Array.isArray(block.items_ar) && block.items_ar.some((item: any) => typeof item === 'string' && item.trim())) return true
    if (typeof block.image === 'string' && block.image.trim()) return true
    if (typeof block.url === 'string' && block.url.trim()) return true
    if (Array.isArray(block.images) && block.images.some((item: any) => typeof item === 'string' && item.trim())) return true
    return block.type === 'horizontalRule'
  })
}

function lessonSetScore(rows: Lesson[]): number {
  const validRows = rows.filter((lesson) => lesson.id && lesson.slug)
  const nonSpecial = validRows.filter((lesson) => !isSpecialLesson(lesson))
  const bodyCount = nonSpecial.filter(hasRenderableBody).length
  return nonSpecial.length * 1000 + bodyCount * 100 + validRows.length
}

function shouldAttemptRemoteFallback(rows: Lesson[]): boolean {
  if (rows.length === 0) return true
  if (!hasNonSpecialLessons(rows)) return true
  const nonSpecialRows = rows.filter((lesson) => !isSpecialLesson(lesson))
  return nonSpecialRows.every((lesson) => !hasRenderableBody(lesson))
}

function shouldUseRemoteRows(localRows: Lesson[], remoteRows: Lesson[]): boolean {
  if (localRows.length === 0) return true
  return lessonSetScore(remoteRows) > lessonSetScore(localRows)
}

function shouldAllowDraftPublicFallback(): boolean {
  const value = (process.env.LESSONS_PUBLIC_DRAFT_FALLBACK || '').trim().toLowerCase()
  return value !== '0' && value !== 'false'
}

function promoteDraftLessonsForPublic(rows: Lesson[]): Lesson[] {
  return rows.map((lesson) => {
    const normalizedSlug = normalizeSlug(stripLegacyDraftSuffix(lesson.slug || lesson.lessonKey || lesson.id || ''))
    const normalizedKey = stripLegacyDraftSuffix(lesson.lessonKey || '') || normalizedSlug
    const normalizedId = stripLegacyDraftSuffix(lesson.id || '') || normalizedKey || normalizedSlug || lesson.id
    return {
      ...lesson,
      id: normalizedId || lesson.id,
      slug: normalizedSlug || stripLegacyDraftSuffix(lesson.slug || '') || lesson.slug,
      lessonKey: normalizedKey || normalizedId || lesson.lessonKey || lesson.id,
      status: LESSON_STATUS.PUBLISHED,
      publishedAt: lesson.publishedAt || new Date(0).toISOString(),
    }
  })
}

function getFallbackActorId(): string | undefined {
  const candidates = [
    process.env.LESSONS_FALLBACK_ACTOR_ID,
    process.env.LESSONS_FALLBACK_USER_ID,
    process.env.LESSONS_FALLBACK_X_USER_ID,
  ]
  for (const value of candidates) {
    const normalized = (value || '').trim()
    if (normalized) return normalized
  }
  return undefined
}

async function loadLessonsFromRemoteFallback(
  wikiSlug: string,
  opts?: { includeDrafts?: boolean; actorIdHint?: string }
): Promise<Lesson[] | undefined> {
  const key = `${wikiSlug}:${opts?.includeDrafts ? 'drafts' : 'published'}`
  const cached = remoteLessonsCache.get(key)
  const now = Date.now()
  if (cached && cached.expiresAt > now) {
    return cached.lessons
  }

  const baseUrl = getFallbackApiBaseUrl()
  if (!baseUrl) return undefined

  try {
    const endpoint = new URL('/api/lessons', baseUrl)
    endpoint.searchParams.set('wiki', wikiSlug)
    if (opts?.includeDrafts) {
      endpoint.searchParams.set('includeDrafts', '1')
    }

    const timeoutMs = Number.parseInt(process.env.LESSONS_FALLBACK_TIMEOUT_MS || '5000', 10)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 5000)
    const headers: Record<string, string> = { 'x-rgx-db-fallback': '1' }
    const actorId = getFallbackActorId() || (opts?.actorIdHint || '').trim()
    if (actorId) {
      headers['x-user-id'] = actorId
    }

    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return undefined
    }

    const payload = await response.json()
    if (!Array.isArray(payload)) {
      return undefined
    }

    const normalized = payload
      .map((lesson) => normalizeLessonFromRemote(lesson, wikiSlug))
      .filter((lesson) => lesson.id && lesson.slug)

    if (normalized.length > 0) {
      remoteLessonsCache.set(key, {
        expiresAt: now + REMOTE_LESSON_CACHE_TTL_MS,
        lessons: normalized,
      })
    }

    return normalized
  } catch (error) {
    console.error(`[data] Remote lesson fallback failed for "${wikiSlug}":`, error)
    return undefined
  }
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

function ensureResourcesLesson(list: Lesson[], wikiSlug: string): Lesson[] {
  const hasResources = list.some((lesson) => normalizeSlug(lesson.slug || '') === RESOURCES_LESSON_SLUG)
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
  const normKit = normalizeSlug(kitSlug)
  const wikiSlug = wikiSlugForKit(normKit)
  const includeDrafts = opts?.includeDrafts === true
  const shouldUseDb = process.env.USE_DB === 'true'
  const buildLessonsResult = (rows: Lesson[], draftFallbackRows?: Lesson[]): Lesson[] => {
    const collapsed = includeDrafts
      ? collapseLessonsForEditor(rows as Lesson[])
      : collapseLessonsForPublic(rows as Lesson[])
    if (!includeDrafts && shouldAllowDraftPublicFallback() && !hasNonSpecialLessons(collapsed as Lesson[])) {
      const editorCollapsed = collapseLessonsForEditor((draftFallbackRows || rows) as Lesson[])
      if (hasNonSpecialLessons(editorCollapsed as Lesson[])) {
        const promoted = promoteDraftLessonsForPublic(editorCollapsed as Lesson[])
        return ensureResourcesLesson(promoted as Lesson[], wikiSlug)
      }
    }
    return ensureResourcesLesson(collapsed as Lesson[], wikiSlug)
  }

  if (!shouldUseDb) {
    const raw = loadJsonFile<any[]>(`lessons.${wikiSlug}.json`, [])
    const rows: Lesson[] = raw.map((row) =>
      mapLegacyLessonRow({ ...row, status: row.status || LESSON_STATUS.PUBLISHED })
    )
    return buildLessonsResult(rows)
  }

  if (shouldBypassDb(wikiSlug)) {
    console.log(`[data] Bypassing DB for wiki: ${wikiSlug} (next retry in <5s)`)
    throw new Error(`Database access is temporarily unavailable for wiki "${wikiSlug}".`)
  }

  try {
    const prisma: any = getPrisma(wikiSlug)
    let rows: Lesson[]
    try {
      rows = await withDbTimeout(() =>
        prisma.lesson.findMany({
          where: {
            wikiSlug,
            ...(includeDrafts ? {} : { status: LESSON_STATUS.PUBLISHED }),
          },
          orderBy: [{ order: 'asc' }, { version: 'desc' }],
        })
      )
    } catch (error: any) {
      if (!isLegacyLessonSchemaError(error)) throw error
      const legacyRows: any[] = await withDbTimeout(() =>
        prisma.lesson.findMany({
          where: {
            wikiSlug,
            ...(includeDrafts ? {} : { status: LESSON_STATUS.PUBLISHED }),
          },
          orderBy: [{ order: 'asc' }, { updatedAt: 'desc' }],
          select: legacyLessonReadSelect,
        })
      )
      rows = legacyRows.map(mapLegacyLessonRow)
    }
    markDbSuccess(wikiSlug)
    const collapsed = includeDrafts
      ? collapseLessonsForEditor(rows as Lesson[])
      : collapseLessonsForPublic(rows as Lesson[])
    const enriched = enrichLessonsWithPublishState(rows as Lesson[], collapsed as Lesson[], includeDrafts)
    return ensureResourcesLesson(enriched as Lesson[], wikiSlug)
  } catch (e) {
    markDbFailure(wikiSlug)
    console.error("Failed to fetch lessons from db", e)
    const message = e instanceof Error ? e.message : 'Unknown database error'
    throw new Error(`Failed to fetch lessons from database for wiki "${wikiSlug}": ${message}`)
  }
}


export function getModules(wikiSlug: string): any[] {
    return []
}

export function findLessonInList(lessons: Lesson[], lessonSlug: string): Lesson | undefined {
  const rawSlug = (lessonSlug || '').trim()
  const normSlug = normalizeSlug(rawSlug)
  const baseSlug = stripLegacyDraftSuffix(normSlug)
  const draftSlug = `${baseSlug}${LEGACY_DRAFT_SUFFIX}`

  const candidates = new Set<string>([rawSlug, normSlug, baseSlug, draftSlug])

  return lessons.find((l) => {
    const lessonSlugNorm = normalizeSlug(l.slug || '')
    const lessonIdNorm = normalizeSlug(l.id || '')
    return candidates.has(lessonSlugNorm) || candidates.has(lessonIdNorm)
  })
}

export async function getLesson(
  kit: string,
  lessonSlug: string,
  opts?: { includeDrafts?: boolean }
): Promise<Lesson | undefined> {
  const lessons = await getLessons(kit, opts)
  return findLessonInList(lessons, lessonSlug)
}

function sortLessons(list: Lesson[]): Lesson[] {
  return list.slice().sort((a, b) => (a.order || 0) - (b.order || 0))
}

export function findPrevNextInList(
  lessons: Lesson[],
  slug: string
): { prev?: Lesson; next?: Lesson } {
  const list = sortLessons(lessons)
  const idx = list.findIndex((l) => l.slug === slug)
  if (idx < 0) return {}
  return {
    prev: idx > 0 ? list[idx - 1] : undefined,
    next: idx < list.length - 1 ? list[idx + 1] : undefined,
  }
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
