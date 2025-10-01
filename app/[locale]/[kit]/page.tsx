import { redirect, notFound } from "next/navigation"
import { getLessons, getKit, getWiki } from "@/lib/data"
import { getLessonsFromDb } from "@/lib/server-data"
import type { Locale } from "@/lib/i18n"

export const dynamic = "force-dynamic"

function mergeLessons(fileLessons: any[], dbLessons: any[], wikiSlug: string) {
  const map = new Map<string, any>()
  fileLessons.forEach((lesson) => map.set(lesson.slug, lesson))
  dbLessons.forEach((lesson) => {
    if (lesson?.slug) map.set(lesson.slug, lesson)
  })
  return Array.from(map.values())
    .filter((lesson) => (lesson.wikiSlug ? lesson.wikiSlug === wikiSlug : true))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
}

export default async function KitPage({ params }: { params: { locale: Locale; kit: string } }) {
  const { locale, kit } = params
  const kitData = getKit(kit)
  if (!kitData) notFound()
  const wiki = getWiki(kitData.wikiSlug)
  if (!wiki) notFound()

  const lessonsFromFile = getLessons(kit)

  let lessonsFromDb: any[] = []
  if (process.env.USE_DB === "true") {
    try {
      lessonsFromDb = await getLessonsFromDb(wiki.slug)
    } catch {}
  }

  const mergedLessons = mergeLessons(lessonsFromFile, lessonsFromDb, wiki.slug)

  // Always prioritize Getting Started lesson first
  let candidateSlug = mergedLessons.find(lesson => lesson.slug === 'getting-started')?.slug

  // Fallback to default lesson or first lesson
  if (!candidateSlug) {
    candidateSlug = wiki.defaultLessonSlug && mergedLessons.some((lesson) => lesson.slug === wiki.defaultLessonSlug)
      ? wiki.defaultLessonSlug
      : undefined

    if (!candidateSlug && mergedLessons.length) {
      candidateSlug = mergedLessons[0].slug
    }
  }

  if (!candidateSlug) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-semibold">No lessons available</h1>
        <p className="text-gray-600">Add a lesson in the editor to get started.</p>
      </div>
    )
  }

  redirect(`/${locale}/${kit}/lesson/${candidateSlug}`)
}
