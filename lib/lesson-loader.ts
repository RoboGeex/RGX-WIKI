
import { getLessons, getKits, getWiki } from "@/lib/data"
import { getLessonsFromDb, getLessonVersionRowsFromDb } from "@/lib/server-data"
import type { Lesson } from "@/lib/types"

export type LessonGroup = {
  kit: { slug: string; title: string }
  lessons: Lesson[]
}

const LEGACY_DRAFT_SUFFIX = '--draft'

function stripLegacyDraftSuffix(value?: string) {
  const normalized = (value || '').trim()
  return normalized.endsWith(LEGACY_DRAFT_SUFFIX)
    ? normalized.slice(0, normalized.length - LEGACY_DRAFT_SUFFIX.length)
    : normalized
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
  const fileLessons = await getLessons(kitSlug, { includeDrafts: true })
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
  const familyState = new Map<string, { hasDraft: boolean; hasPublished: boolean; lastPublishedAt: string }>()
  allSourceLessons.forEach((lesson) => {
    const familyKey = getLessonFamilyKey(lesson)
    const current = familyState.get(familyKey) || { hasDraft: false, hasPublished: false, lastPublishedAt: '' }
    const publishedAt = toIsoDate((lesson as any).publishedAt)
    const lastPublishedAt = toIsoDate((lesson as any).lastPublishedAt)
    if (lesson.status === 'published') {
      current.hasPublished = true
      if (!current.lastPublishedAt && publishedAt) {
        current.lastPublishedAt = publishedAt
      }
    } else {
      current.hasDraft = true
    }
    if (!current.lastPublishedAt && lastPublishedAt) {
      current.lastPublishedAt = lastPublishedAt
    }
    familyState.set(familyKey, current)
  })

  const map = new Map<string, Lesson>()
  
  fileLessons.forEach((lesson) => {
    map.set(lesson.slug, lesson)
  })

  dbLessons.forEach((lesson) => {
    if (lesson?.slug) {
      map.set(lesson.slug, lesson)
    }
  })

  const allLessons = Array.from(map.values())
    .filter((lesson) => !lesson.wikiSlug || lesson.wikiSlug === wikiSlug)
    .map((lesson) => {
      const family = familyState.get(getLessonFamilyKey(lesson))
      if (!family) return lesson
      return {
        ...lesson,
        lastPublishedAt: lesson.lastPublishedAt || family.lastPublishedAt || '',
        hasUnpublishedChanges:
          Boolean(lesson.hasUnpublishedChanges) ||
          Boolean(family.hasDraft && family.hasPublished),
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
