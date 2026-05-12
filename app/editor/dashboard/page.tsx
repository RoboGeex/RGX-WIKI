import Link from "next/link"
import { getWikis, getKits } from "@/lib/data"
import { loadLessonsForKit } from "@/lib/lesson-loader"
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

  // Per-wiki budget: never let one slow / unreachable wiki DB hold up the
  // whole dashboard.  We race each wiki's lesson load against a short timeout
  // and fall back to 0 lessons if it exceeds the budget.  Combined with the
  // shouldBypassDb cache in lib/db-fallback, the second visit after a failure
  // returns instantly without even attempting the DB.
  const PER_WIKI_BUDGET_MS = 2500

  const withBudget = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
    Promise.race<T>([
      p,
      new Promise<T>((resolve) =>
        setTimeout(() => resolve(fallback), PER_WIKI_BUDGET_MS),
      ),
    ])

  const summaries = await Promise.all(
    wikis.map(async (wiki) => {
      const kits = getKits(wiki.slug)
      const kitSlugs = kits.length ? kits.map((kit) => kit.slug) : [wiki.slug]

      // Parallel-load lesson counts for every kit, each with its own budget
      const counts = await Promise.all(
        kitSlugs.map((kitSlug) =>
          withBudget(
            loadLessonsForKit(kitSlug, wiki.slug)
              .then((lessons) => lessons.length)
              .catch(() => 0),
            0,
          ),
        ),
      )
      const lessonCount = counts.reduce((sum, n) => sum + n, 0)
      return { wiki, lessonCount }
    }),
  )

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
