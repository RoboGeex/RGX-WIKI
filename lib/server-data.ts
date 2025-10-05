// Server-only helpers to fetch from DB when USE_DB=true
import type { Lesson } from '@/lib/types'
import { prisma } from '@/lib/prisma'

export function syncGetLessons(kitSlug: string): Lesson[] {
  throw new Error('syncGetLessons is not usable in sync context. Use API or refactor to async.')
}

export async function getLessonsFromDb(wikiSlug?: string): Promise<Lesson[]> {
  if (process.env.USE_DB !== 'true') {
    return []
  }
  
  const rows = await prisma.lesson.findMany({
    where: wikiSlug ? { wikiSlug } : undefined,
    orderBy: [{ order: 'asc' }],
  })
  return rows as unknown as Lesson[]
}

export async function getLessonBySlug(slug: string): Promise<Lesson | undefined> {
  if (process.env.USE_DB !== 'true') {
    return undefined
  }

  const row = await prisma.lesson.findUnique({ where: { slug } })
  return row as unknown as Lesson | undefined
}
