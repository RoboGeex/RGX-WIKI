import fs from 'fs'
import path from 'path'
import os from 'os'
import { Wiki, Kit, Material, Module, LessonBodyItem, Lesson } from '@/lib/types';
import kitsData from '@/data/kits.json'
import wikisData from '@/data/wikis.json'
import { getPrisma } from '@/lib/prisma-multi'

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
    const enforcementDisabled = process.env.ENFORCE_DEV_OWNERSHIP !== 'true'
    const includeDrafts = opts?.includeDrafts === true || process.env.NODE_ENV === 'development' || enforcementDisabled
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

export async function getLesson(
  kit: string,
  lessonSlug: string,
  opts?: { includeDrafts?: boolean }
): Promise<Lesson | undefined> {
  const lessons = await getLessons(kit, opts)
  const normSlug = normalizeSlug(lessonSlug)
  return lessons.find(l => l.slug === normSlug || l.slug === lessonSlug)
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
