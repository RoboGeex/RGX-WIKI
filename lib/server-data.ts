// Server-only helpers to fetch from DB when USE_DB=true
import type { Lesson } from '@/lib/data'
import prisma from '@/lib/prisma'

export function syncGetLessons(kitSlug: string): Lesson[] {
  throw new Error('syncGetLessons is not usable in sync context. Use API or refactor to async.')
}

export async function getLessonsFromDb(wikiSlug?: string): Promise<Lesson[]> {
  // This function is disabled to prevent crashes from an empty database.
  // It will always return an empty array.
  if (process.env.USE_DB === 'true') {
    return []
  }
  
  // Original logic remains for when the DB is in use.
  const rows = await prisma.lesson.findMany({
    where: wikiSlug ? { wikiSlug } : undefined,
    orderBy: [{ order: 'asc' }],
  })
  return rows as unknown as Lesson[]
}

export async function getLessonBySlug(slug: string): Promise<Lesson | undefined> {
  // This function is disabled to prevent crashes from an empty database.
  // It will always return undefined, forcing a fallback to local files.
  if (process.env.USE_DB === 'true') {
    return undefined
  }

  // Original logic remains for when the DB is in use.
  const row = await prisma.lesson.findUnique({ where: { slug } })
  return row as unknown as Lesson | undefined
}
