import { getWikis } from "@/lib/data"
import EditorDashboardClient from "./editor-dashboard-client"
import AdminNavbar from "@/components/admin-navbar"
import { getWikisFromDb } from "@/lib/server-data"

export const dynamic = "force-dynamic"

export default async function EditorDashboardPage() {
  const fileWikis = getWikis()
  const dbWikis = await getWikisFromDb()
  const wikis =
    dbWikis.length > 0
      ? (() => {
          const bySlug = new Map(fileWikis.map((wiki) => [wiki.slug, wiki]))
          dbWikis.forEach((wiki) => {
            bySlug.set(wiki.slug, { ...(bySlug.get(wiki.slug) || {}), ...wiki })
          })
          return Array.from(bySlug.values())
        })()
      : fileWikis

  // Lesson counts are fetched client-side, per-tile, via /api/wikis/[slug]/lesson-count.
  // This keeps the dashboard render fast regardless of how many wiki DBs are slow
  // or unreachable — each tile shows its own loading state independently.
  const summaries = wikis.map((wiki) => ({ wiki, lessonCount: null as number | null }))

  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <AdminNavbar />
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-10 pt-20">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">Content Editor</h1>
          <p className="text-sm text-gray-600">
            Select a wiki to manage its lessons. From there you can jump straight into editing.
          </p>
        </header>

        <EditorDashboardClient initialSummaries={summaries} />
      </div>
    </div>
  )
}
