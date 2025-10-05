import { Wiki, Kit, Material, Module, LessonBodyItem, Lesson } from './types';
import kitsData from '../data/kits.json'
import wikisData from '../data/wikis.json'

const kits = kitsData as Kit[]
const wikis = wikisData as Wiki[]

function wikiSlugForKit(kitSlug: string): string {
  const kit = kits.find(k => k.slug === kitSlug)
  return kit?.wikiSlug || kitSlug
}

export function getWikis(): Wiki[] { return wikis }
export function getWiki(slug: string) { return wikis.find(w => w.slug === slug) }
export function getWikiByDomain(host?: string | null) {
  const normalised = host?.split(':')[0].toLowerCase()
  if (!normalised) return undefined
  return wikis.find(w => (w.domains || []).map(d => d.toLowerCase()).includes(normalised))
}
export function getKits(wikiSlug?: string): Kit[] {
  if (wikiSlug) return kits.filter(k => k.wikiSlug === wikiSlug)
  return kits
}
export function getKit(slug: string, wikiSlug?: string) {
  return kits.find(k => k.slug === slug && (!wikiSlug || k.wikiSlug === wikiSlug))
}

export async function getLessons(kitSlug: string): Promise<Lesson[]> {
  const wikiSlug = wikiSlugForKit(kitSlug)
  try {
    const { prisma } = await import('../lib/prisma')
    if (!prisma) return []
    const lessons = await prisma.lesson.findMany({
      where: { wikiSlug },
      orderBy: { order: 'asc' },
    })
    return lessons as unknown as Lesson[]
  } catch (e) {
    console.error("Failed to fetch lessons from db", e)
    return []
  }
}

export function getModules(wikiSlug: string): any[] {
    return []
}

export async function getLesson(kit: string, lessonSlug: string): Promise<Lesson | undefined> {
  const lessons = await getLessons(kit)
  return lessons.find(l => l.slug === lessonSlug)
}

function sortLessons(list: Lesson[]): Lesson[] {
  return list.slice().sort((a, b) => (a.order || 0) - (b.order || 0))
}

export async function getFirstLesson(kit: string): Promise<Lesson | undefined> {
  const lessons = await getLessons(kit)
  const list = sortLessons(lessons)
  return list[0]
}

export async function getNextLesson(kit: string, slug: string): Promise<Lesson | undefined> {
  const lessons = await getLessons(kit)
  const list = sortLessons(lessons)
  const idx = list.findIndex(l => l.slug === slug)
  if (idx >= 0 && idx < list.length - 1) return list[idx + 1]
}

export async function getPrevLesson(kit: string, slug: string): Promise<Lesson | undefined> {
  const lessons = await getLessons(kit)
  const list = sortLessons(lessons)
  const idx = list.findIndex(l => l.slug === slug)
  if (idx > 0) return list[idx - 1]
}
