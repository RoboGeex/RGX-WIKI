import type { Lesson } from '@/lib/types'
import { getLessonsFromDb } from '@/lib/server-data'

// Lessons live in per-wiki databases (getPrisma(wikiSlug)) while enrollments
// and lessonProgress live in the default DB. Dashboards must therefore load
// lesson lists per wiki and join them to progress rows in code by lesson id —
// querying `prisma.lesson` on the default client returns 0 rows for wikis
// whose lessons are stored in their own database (e.g. ziggy, clicky).
export async function getPublishedLessonsByWiki(
  wikiSlugs: string[]
): Promise<Map<string, Lesson[]>> {
  const unique = [...new Set(wikiSlugs)]
  const entries = await Promise.all(
    unique.map(async (slug) => {
      try {
        const lessons = await getLessonsFromDb(slug, { publishedOnly: true })
        return [slug, lessons] as const
      } catch (error) {
        // One unreachable wiki DB must not take down the whole dashboard.
        console.warn(`[wiki-lessons] Failed to load lessons for wiki "${slug}"; treating as empty.`, error)
        return [slug, [] as Lesson[]] as const
      }
    })
  )
  return new Map(entries)
}
