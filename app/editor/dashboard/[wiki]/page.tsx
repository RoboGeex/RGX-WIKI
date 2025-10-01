import Link from "next/link"
import { notFound } from "next/navigation"
import { getWiki, getKits } from "@/lib/data"
import { loadLessonsForKit } from "@/lib/lesson-loader"
import LessonsReorderList from "@/components/editor/LessonsReorderList"

export const dynamic = "force-dynamic"

interface Params {
  params: { wiki: string }
}

export default async function EditorWikiDashboardPage({ 
  params, 
  searchParams 
}: Params & { searchParams: { kit?: string } }) {
  const { wiki: wikiSlug } = params
  const { kit: selectedKitSlug } = searchParams
  const wiki = getWiki(wikiSlug)
  if (!wiki) notFound()

  const kits = getKits(wiki.slug)
  const kitSummaries = kits.length
    ? kits.map((kit) => ({ slug: kit.slug, title: kit.title_en }))
    : [{ slug: wiki.slug, title: wiki.displayName || wiki.slug }]

  // Filter to specific kit if provided
  const filteredKits = selectedKitSlug 
    ? kitSummaries.filter(kit => kit.slug === selectedKitSlug)
    : kitSummaries

  const groups = await Promise.all(
    filteredKits.map(async (kit) => ({
      kit,
      lessons: await loadLessonsForKit(kit.slug, wiki.slug),
    }))
  )

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link href="/editor/dashboard" className="text-xs uppercase tracking-widest text-gray-500 hover:text-gray-700">
            ? Back to dashboard
          </Link>
          {selectedKitSlug && (
            <>
              <span className="text-xs text-gray-400">/</span>
              <Link href={`/dashboard/${wiki.slug}`} className="text-xs uppercase tracking-widest text-gray-500 hover:text-gray-700">
                Back to wiki
              </Link>
            </>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          {selectedKitSlug ? `${filteredKits[0]?.title} - Reorder Lessons` : wiki.displayName || wiki.slug}
        </h1>
        <p className="text-sm text-gray-600">
          {selectedKitSlug ? "Drag and drop to reorder lessons. Getting Started lesson is fixed and cannot be moved or deleted." : "Select a lesson to open it in the editor."}
        </p>
      </div>

      {groups.map(({ kit, lessons }) => (
        <section key={kit.slug} className="space-y-4">
          <header className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{kit.title}</h2>
            <div className="flex items-center gap-3">
              <Link
                href={`/editor/properties?kit=${kit.slug}&wiki=${wiki.slug}&new=true`}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Lesson
              </Link>
              <span className="text-xs text-gray-500">{lessons.length} lesson{lessons.length === 1 ? '' : 's'}</span>
            </div>
          </header>
          <LessonsReorderList
            wikiSlug={wiki.slug}
            kitSlug={kit.slug}
            defaultLocale={wiki.defaultLocale || 'en'}
            lessons={lessons.map(({ id, slug, title_en, title_ar, duration_min, difficulty, order }) => ({
              id,
              slug,
              title_en,
              title_ar,
              duration_min,
              difficulty,
              order,
            }))}
          />
        </section>
      ))}
    </div>
  )
}





