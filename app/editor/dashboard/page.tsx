import Link from "next/link"
import { getWikis, getKits } from "@/lib/data"
import { loadLessonsForKit } from "@/lib/lesson-loader"

export const dynamic = "force-dynamic"

export default async function EditorDashboardPage() {
  const wikis = getWikis()

  const summaries = await Promise.all(
    wikis.map(async (wiki) => {
      const kits = getKits(wiki.slug)
      const kitSlugs = kits.length ? kits.map((kit) => kit.slug) : [wiki.slug]
      let lessonCount = 0
      for (const kitSlug of kitSlugs) {
        const lessons = await loadLessonsForKit(kitSlug, wiki.slug)
        lessonCount += lessons.length
      }
      return { wiki, lessonCount }
    })
  )

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">Content Dashboard</h1>
        <p className="text-sm text-gray-600">
          Select a wiki to manage its lessons. From there you can open any lesson in the editor.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {summaries.map(({ wiki, lessonCount }) => (
          <Link
            key={wiki.slug}
            href={`/editor/dashboard/${wiki.slug}`}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary/40 hover:shadow"
          >
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Wiki</div>
            <h2 className="text-xl font-semibold text-gray-900">{wiki.displayName || wiki.slug}</h2>
            <p className="mt-4 text-sm text-gray-600">
              {lessonCount} lesson{lessonCount === 1 ? '' : 's'} available
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}