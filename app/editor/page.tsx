import Link from "next/link"
import { getWikis, getKits } from "@/lib/data"
import { loadLessonsForKit } from "@/lib/lesson-loader"
import EditorDashboardClient from "./dashboard/editor-dashboard-client"
import AdminNavbar from '@/components/admin-navbar'

export const dynamic = "force-dynamic"

export default async function EditorPage() {
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