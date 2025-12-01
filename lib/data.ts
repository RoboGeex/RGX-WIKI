import fs from 'fs'
import path from 'path'
import os from 'os'
import { Wiki, Kit, Material, Module, LessonBodyItem, Lesson } from '@/lib/types';
import kitsData from '@/data/kits.json'
import wikisData from '@/data/wikis.json'

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

export function getWikis(): Wiki[] { return loadWikis() }

export function getWiki(slug: string) {
  const wiki = loadWikis().find(w => w.slug === slug);
  if (wiki) {
    return wiki;
  }
  // If no wiki is found by slug, try to find by kit slug
  const wikiSlug = wikiSlugForKit(slug);
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
  if (wikiSlug) {
    return kits.find(k => k.slug === slug && k.wikiSlug === wikiSlug);
  }
  // Otherwise, just find the first kit with the given slug.
  const found = kits.find(k => k.slug === slug);
  if (found) return found
  const wiki = getWiki(slug) || (wikiSlug ? getWiki(wikiSlug) : undefined)
  if (wiki) return createKitFromWiki(wiki)
  return undefined;
}

export async function getLessons(kitSlug: string, opts?: { includeDrafts?: boolean }): Promise<Lesson[]> {
  const wikiSlug = wikiSlugForKit(kitSlug)
  const includeDrafts = opts?.includeDrafts === true
  try {
    const { getPrisma } = await import('@/lib/prisma-multi')
    const prisma = getPrisma(wikiSlug)
    const lessons = await prisma.lesson.findMany({
      where: { wikiSlug, ...(includeDrafts ? {} : { status: 'published' }) },
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
