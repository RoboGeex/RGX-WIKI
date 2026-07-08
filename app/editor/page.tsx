import { getWikis } from "@/lib/data"
import EditorDashboardClient from "./dashboard/editor-dashboard-client"
import AdminNavbar from '@/components/admin-navbar'
import { getWikisFromDb } from '@/lib/server-data'

export const dynamic = "force-dynamic"

export default async function EditorPage() {
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

  // Lesson counts are loaded client-side, per wiki, in parallel via
  // /api/wikis/[slug]/lesson-count (see EditorDashboardClient) — using the exact
  // same counting logic. Passing null keeps the initial server render fast;
  // previously this page loaded and de-duplicated every lesson of every kit of
  // every wiki just to show a count, which took many seconds against the DB.
  const summaries = wikis.map((wiki) => ({ wiki, lessonCount: null }))

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
