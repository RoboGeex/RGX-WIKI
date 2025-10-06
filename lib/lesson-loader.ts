
import { getLessons, getKits, getWiki } from "@/lib/data"
import { getLessonsFromDb } from "@/lib/server-data"
import type { Lesson } from "@/lib/types"

export type LessonGroup = {
  kit: { slug: string; title: string }
  lessons: Lesson[]
}

export async function loadLessonsForKit(kitSlug: string, wikiSlug: string): Promise<Lesson[]> {
  const fileLessons = await getLessons(kitSlug)
  let dbLessons: Lesson[] = []
  if (process.env.USE_DB === 'true') {
    try {
      dbLessons = await getLessonsFromDb(wikiSlug)
    } catch {}
  }
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
