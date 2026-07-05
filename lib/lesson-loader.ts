
import { getLessons, getKits, getWiki } from "@/lib/data"
import { getLessonsFromDb, getLessonVersionRowsFromDb } from "@/lib/server-data"
import type { Lesson } from "@/lib/types"
import { hasUnpublishedLessonChanges, pickLatestDraft, pickLatestPublished, sortVersionRowsDesc } from "@/lib/lesson-versions"

export type LessonGroup = {
  kit: { slug: string; title: string }
  lessons: Lesson[]
}

const LEGACY_DRAFT_SUFFIX_RE = /--draft(-\d+)?$/

function stripLegacyDraftSuffix(value?: string) {
  const normalized = (value || '').trim()
  return normalized.replace(LEGACY_DRAFT_SUFFIX_RE, '')
}

function getLessonFamilyKey(lesson: Lesson) {
  return (
    stripLegacyDraftSuffix(lesson.lessonKey) ||
    stripLegacyDraftSuffix(lesson.slug) ||
    lesson.slug
  ).trim()
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

export async function loadLessonsForKit(kitSlug: string, wikiSlug: string): Promise<Lesson[]> {
  // getLessons() queries the DB when USE_DB=true — swallow DB errors so a
  // single unreachable wiki database never crashes the whole caller.
  let fileLessons: Lesson[] = []
  try {
    fileLessons = await getLessons(kitSlug, { includeDrafts: true })
  } catch (e) {
    console.warn(`[lesson-loader] getLessons failed for kit "${kitSlug}" (wiki "${wikiSlug}") — proceeding with empty list:`, e instanceof Error ? e.message : e)
  }
  let dbLessons: Lesson[] = []
  let dbVersionRows: Lesson[] = []
  if (process.env.USE_DB === 'true') {
    try {
      dbLessons = await getLessonsFromDb(wikiSlug)
    } catch {}
    try {
      dbVersionRows = await getLessonVersionRowsFromDb(wikiSlug)
    } catch {}
  }
  const allSourceLessons = dbVersionRows.length > 0 ? dbVersionRows : [...fileLessons, ...dbLessons]
  const familyRows = new Map<string, Lesson[]>()
  allSourceLessons.forEach((lesson) => {
    const familyKey = getLessonFamilyKey(lesson)
    const list = familyRows.get(familyKey) || []
    list.push(lesson)
    familyRows.set(familyKey, list)
  })

  const familyState = new Map<string, { hasPublished: boolean; lastPublishedAt: string; hasUnpublishedChanges: boolean }>()
  familyRows.forEach((rows, familyKey) => {
    const sorted = sortVersionRowsDesc(rows)
    const latestDraft = pickLatestDraft(sorted)
    const latestPublished = pickLatestPublished(sorted)
    const hasPublished = Boolean(latestPublished)
    const lastPublishedAt = toIsoDate((latestPublished as any)?.publishedAt || '')
    const hasUnpublishedChanges = hasUnpublishedLessonChanges(latestDraft, latestPublished)

    familyState.set(familyKey, { hasPublished, lastPublishedAt, hasUnpublishedChanges })
  })

  allSourceLessons.forEach((lesson) => {
    const familyKey = getLessonFamilyKey(lesson)
    const current = familyState.get(familyKey) || { hasPublished: false, lastPublishedAt: '', hasUnpublishedChanges: false }
    const publishedAt = toIsoDate((lesson as any).publishedAt)
    const lastPublishedAt = toIsoDate((lesson as any).lastPublishedAt)
    if (lesson.status === 'published') {
      current.hasPublished = true
      if (!current.lastPublishedAt && publishedAt) {
        current.lastPublishedAt = publishedAt
      }
    }
    if (!current.lastPublishedAt && lastPublishedAt) {
      current.lastPublishedAt = lastPublishedAt
    }
    familyState.set(familyKey, current)
  })

  const lessonMap = new Map<string, Lesson>()

  fileLessons.forEach((lesson) => {
    const key = getLessonFamilyKey(lesson) || lesson.slug
    if (!key) return
    lessonMap.set(key, lesson)
  })

  dbLessons.forEach((lesson) => {
    const key = getLessonFamilyKey(lesson) || lesson.slug
    if (!key) return
    lessonMap.set(key, lesson)
  })

  const allLessons = Array.from(lessonMap.values())
    .filter((lesson) => !lesson.wikiSlug || lesson.wikiSlug === wikiSlug)
    .map((lesson) => {
      const family = familyState.get(getLessonFamilyKey(lesson))
      if (!family) return lesson
      return {
        ...lesson,
        status: family.hasPublished ? 'published' : lesson.status,
        lastPublishedAt: lesson.lastPublishedAt || family.lastPublishedAt || '',
        hasUnpublishedChanges:
          Boolean(lesson.hasUnpublishedChanges) ||
          Boolean(family.hasUnpublishedChanges),
      }
    })
    .sort((a, b) => {
      return (a.order || 0) - (b.order || 0)
    })
  
  return allLessons
}

export async function loadLessonsForWiki(wikiSlug: string): Promise<{ wiki: ReturnType<typeof getWiki>; groups: LessonGroup[] }> {
  const wiki = getWiki(wikiSlug)
  const kits = getKits(wikiSlug)
  const kitSummaries = kits.length
    ? kits.map((kit) => ({ slug: kit.slug, title: kit.title_en }))
    : [{ slug: wikiSlug, title: wiki?.displayName || wikiSlug }]

  const groups = await Promise.all(
    kitSummaries.map(async (kit) => ({
      kit,
      lessons: await loadLessonsForKit(kit.slug, wikiSlug),
    }))
  )

  return { wiki, groups }
}
