import Link from "next/link"
import { notFound } from "next/navigation"
import { getWiki, getKits } from "@/lib/data"
import { loadLessonsForKit } from "@/lib/lesson-loader"

export const dynamic = "force-dynamic"

interface Params {
  params: { wiki: string }
}

export default async function WikiDashboardPage({ params }: Params) {
  const { wiki: wikiSlug } = params
  const wiki = getWiki(wikiSlug)
  if (!wiki) notFound()

  const kits = getKits(wiki.slug)
  const kitSummaries = kits.length
    ? kits.map((kit) => ({ slug: kit.slug, title: kit.title_en }))
    : [{ slug: wiki.slug, title: wiki.displayName || wiki.slug }]

  const groups = await Promise.all(
    kitSummaries.map(async (kit) => ({
      kit,
      lessons: await loadLessonsForKit(kit.slug, wiki.slug),
    }))
  )

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard" className="text-xs uppercase tracking-widest text-gray-500 hover:text-gray-700 inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-1">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{wiki.displayName || wiki.slug}</h1>
        </div>
        
        <Link
          href={`/editor/properties?wiki=${wiki.slug}${groups[0] ? `&kit=${groups[0].kit.slug}` : ''}&new=true`}
          className="px-4 py-2.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Lesson
        </Link>
      </div>
      
      <p className="text-sm text-gray-600 -mt-6 mb-2">Select a lesson to open it in the editor.</p>

      {groups.map(({ kit, lessons }) => (
        <section key={kit.slug} className="space-y-4">
          <header className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{kit.title}</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{lessons.length} lesson{lessons.length === 1 ? '' : 's'}</span>
              <div className="flex items-center gap-2">
                {lessons.length > 0 && (
                  <Link
                    href={`/editor/dashboard/${wiki.slug}?kit=${kit.slug}`}
                    className="px-3 py-1.5 text-xs rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                  >
                    Reorder Lessons
                  </Link>
                )}
              </div>
            </div>
          </header>
          <div className="space-y-2">
            {lessons.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
                No lessons yet for this wiki.
              </div>
            )}
            {lessons.map((lesson) => (
              <div
                key={lesson.slug}
                className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between shadow-sm"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {lesson.title_en || lesson.title_ar || lesson.slug}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {lesson.duration_min} min · {lesson.difficulty}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/editor/lesson?wiki=${wiki.slug}&kit=${kit.slug}&slug=${lesson.slug}&id=${lesson.slug}&title=${encodeURIComponent(lesson.title_en || lesson.title_ar || lesson.slug)}`}
                    className="px-3 py-1.5 text-sm rounded-md border border-primary/40 text-primary hover:bg-primary/10"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/editor/properties?wiki=${wiki.slug}&kit=${kit.slug}&slug=${lesson.slug}`}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100"
                  >
                    Properties
                  </Link>
                  <Link
                    href={`/${wiki.defaultLocale || 'en'}/${kit.slug}/lesson/${lesson.slug}`}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100"
                    target="_blank"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
