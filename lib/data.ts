
import kitsData from '@/data/kits.json'
import wikisData from '@/data/wikis.json'
import lessonsAbbb from '@/data/lessons.abbb.json'
import lessonsCadsoijasdoii from '@/data/lessons.cadsoijasdoii.json'
import lessonsIos from '@/data/lessons.ios.json'
import lessonsNewWiki from '@/data/lessons.new-wiki.json'
import lessonsOsamaFd from '@/data/lessons.osama-fd.json'
import lessonsOsamaKanan1 from '@/data/lessons.osama-kanan-1.json'
import lessonsOsamaKanan from '@/data/lessons.osama-kanan.json'
import lessonsPoint from '@/data/lessons.point.json'
import lessonsStudentKit from '@/data/lessons.student-kit.json'
import lessonsYtttytyu from '@/data/lessons.ytttytyu.json'
import lessonsZzzzz from '@/data/lessons.zzzzz.json'
import lessonsArabic1 from '@/data/lessons.بيسيبig.json'
import lessonsArabic2 from '@/data/lessons.بيسيب.json'

export interface Wiki { slug: string; displayName: string; domains?: string[]; defaultLocale?: string; defaultLessonSlug?: string; resourcesUrl?: string; accessCode?: string; isLocked?: boolean; }
export interface Kit { slug: string; wikiSlug: string; title_en: string; title_ar: string; heroImage: string; overview_en: string; overview_ar: string; }
export interface Material { qty: number; name_en: string; name_ar: string; sku?: string }
export interface Module { id: string; order: number; title_en: string; title_ar: string; summary_en?: string; summary_ar?: string; }
export interface LessonBodyItem { type: 'paragraph' | 'heading' | 'step' | 'callout' | 'codeTabs' | 'image'; en?: string; ar?: string; title_en?: string; title_ar?: string; caption_en?: string; caption_ar?: string; variant?: 'info' | 'tip' | 'warning'; image?: string; arduino?: string; makecodeUrl?: string; level?: number; }
export interface Lesson { id: string; order: number; slug: string; title_en: string; title_ar: string; duration_min: number; difficulty: string; prerequisites_en: string[]; prerequisites_ar: string[]; materials: Material[]; body: LessonBodyItem[]; wikiSlug?: string; isGettingStarted?: boolean; createdAt?: string; updatedAt?: string; }

const kits = kitsData as Kit[]
const wikis = wikisData as Wiki[]

const allLessons: Record<string, Lesson[]> = {
  'abbb': lessonsAbbb as Lesson[],
  'cadsoijasdoii': lessonsCadsoijasdoii as Lesson[],
  'ios': lessonsIos as Lesson[],
  'new-wiki': lessonsNewWiki as Lesson[],
  'osama-fd': lessonsOsamaFd as Lesson[],
  'osama-kanan-1': lessonsOsamaKanan1 as Lesson[],
  'osama-kanan': lessonsOsamaKanan as Lesson[],
  'point': lessonsPoint as Lesson[],
  'student-kit': lessonsStudentKit as Lesson[],
  'ytttytyu': lessonsYtttytyu as Lesson[],
  'zzzzz': lessonsZzzzz as Lesson[],
  'بيسيبig': lessonsArabic1 as Lesson[],
  'بيسيب': lessonsArabic2 as Lesson[],
}

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
  if (process.env.USE_DB === 'true') {
    try {
      const { prisma } = await import('@/lib/prisma')
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
  } else {
    return allLessons[wikiSlug] || []
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
