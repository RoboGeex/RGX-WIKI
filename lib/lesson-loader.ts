
import { getLessons, getKits, getWiki } from "@/lib/data"
import { getLessonsFromDb } from "@/lib/server-data"
import type { Lesson } from "@/lib/types"

export type LessonGroup = {
  kit: { slug: string; title: string }
  lessons: Lesson[]
}

function createGettingStartedLesson(wikiSlug: string): Lesson {
  return {
    id: 'getting-started',
    slug: 'getting-started',
    title_en: 'Getting Started',
    title_ar: 'البداية',
    body: [
      {
        type: 'heading',
        en: 'Getting Started',
        ar: 'البداية',
        level: 1
      },
      {
        type: 'paragraph',
        en: 'Welcome to your wiki! This is your Getting Started lesson where you can introduce users to your content.'
      },
      {
        type: 'paragraph',
        en: 'You can edit this lesson content, but the title and deletion are protected.'
      }
    ],
    duration_min: 5,
    difficulty: 'Beginner',
    order: -1, // Always first
    prerequisites_en: [],
    prerequisites_ar: [],
    materials: [],
    wikiSlug,
    isGettingStarted: true, // Special flag to identify this lesson
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
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
  
  if (!map.has('getting-started')) {
    const gettingStartedLesson = createGettingStartedLesson(wikiSlug)
    map.set('getting-started', gettingStartedLesson)
  } else {
    const lesson = map.get('getting-started')
    if (lesson) {
        lesson.isGettingStarted = true;
        lesson.order = -1;
    }
  }

  const allLessons = Array.from(map.values())
    .filter((lesson) => !lesson.wikiSlug || lesson.wikiSlug === wikiSlug)
    .sort((a, b) => {
      if (a.slug === 'getting-started') return -1
      if (b.slug === 'getting-started') return 1
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
