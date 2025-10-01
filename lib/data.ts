import kitsData from '@/data/kits.json'
import wikisData from '@/data/wikis.json'
// Avoid static import for lessons so runtime changes are visible
import path from 'path'
// Use optional import to avoid bundling 'fs' in client; only server files should import functions using fs.
let readFileSync: any
try { readFileSync = require('fs').readFileSync } catch {}

export interface Wiki {
  slug: string
  displayName: string
  domains?: string[]
  defaultLocale?: string
  defaultLessonSlug?: string
  resourcesUrl?: string
}
export interface Kit {
  slug: string
  wikiSlug: string
  title_en: string
  title_ar: string
  heroImage: string
  overview_en: string
  overview_ar: string
}
export interface Material { qty: number; name_en: string; name_ar: string; sku?: string }
export interface Module {
  id: string
  order: number
  title_en: string
  title_ar: string
  summary_en?: string
  summary_ar?: string
}
export interface LessonBodyItem {
  type: 'paragraph' | 'heading' | 'step' | 'callout' | 'codeTabs' | 'image'
  en?: string; ar?: string
  title_en?: string; title_ar?: string
  caption_en?: string; caption_ar?: string
  variant?: 'info' | 'tip' | 'warning'
  image?: string
  arduino?: string
  makecodeUrl?: string
  level?: number
}
export interface Lesson {
  id: string
  order: number
  slug: string
  title_en: string
  title_ar: string
  duration_min: number
  difficulty: string
  prerequisites_en: string[]
  prerequisites_ar: string[]
  materials: Material[]
  body: LessonBodyItem[]
  wikiSlug?: string
  isGettingStarted?: boolean
  createdAt?: string
  updatedAt?: string
}

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
export function getLessons(kitSlug: string): Lesson[] {
  const wikiSlug = wikiSlugForKit(kitSlug)
  if (process.env.USE_DB === 'true') {
    try {
      const { syncGetLessons } = require('./server-data') as typeof import('./server-data')
      return syncGetLessons(wikiSlug)
    } catch {}
  }
  try {
    const p = path.join(process.cwd(), 'data', `lessons.${wikiSlug}.json`)
    const raw = readFileSync ? readFileSync(p, 'utf-8') : '[]'
    return JSON.parse(raw) as Lesson[]
  } catch {}
  return []
}

export function getModules(wikiSlug: string): any[] {
  try {
    const p = path.join(process.cwd(), 'data', `modules.${wikiSlug}.json`)
    const raw = readFileSync ? readFileSync(p, 'utf-8') : '[]'
    return JSON.parse(raw)
  } catch {}
  return []
}
export function getLesson(kit: string, lessonSlug: string) {
  return getLessons(kit).find(l => l.slug === lessonSlug)
}

function sortLessons(list: Lesson[]): Lesson[] {
  return list.slice().sort((a, b) => (a.order || 0) - (b.order || 0))
}

export function getNextLesson(kit: string, slug: string) {
  const list = sortLessons(getLessons(kit))
  const idx = list.findIndex(l => l.slug === slug)
  if (idx >= 0 && idx < list.length - 1) return list[idx + 1]
}
export function getPrevLesson(kit: string, slug: string) {
  const list = sortLessons(getLessons(kit))
  const idx = list.findIndex(l => l.slug === slug)
  if (idx > 0) return list[idx - 1]
}
