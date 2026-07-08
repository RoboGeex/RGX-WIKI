import { redirect } from "next/navigation"
import { getWikis } from "@/lib/data"
import { getWikisFromDb } from "@/lib/server-data"
import { getEditorSidebarData } from "@/lib/editor-wikis"
import EditorDashboardClient from "./editor-dashboard-client"
import WikiSidebar from "@/components/editor/WikiSidebar"

export const dynamic = "force-dynamic"

export default async function EditorDashboardPage() {
  const sidebar = await getEditorSidebarData()

  // The wikis screen is a side-panel (wikis) + main-area (lessons) layout with
  // no top bar; the index route just drops you into the first wiki you can
  // manage.
  if (sidebar.wikis.length > 0) {
    redirect(`/editor/dashboard/${sidebar.wikis[0].slug}`)
  }

  if (sidebar.hasIdentity) {
    // Logged in but no manageable wikis: show the empty sidebar (superadmins
    // can create a wiki from here).
    return (
      <div className="flex min-h-screen bg-[#eef2f1]">
        <WikiSidebar wikis={[]} isSuperadmin={sidebar.isSuperadmin} />
        <main className="flex-1 flex items-center justify-center p-10">
          <div className="animate-fade-in text-center max-w-sm">
            <h1 className="text-xl font-bold text-gray-900">No wikis yet</h1>
            <p className="mt-2 text-sm text-gray-600">
              {sidebar.isSuperadmin
                ? "Create your first wiki from the panel on the left."
                : "You haven't been assigned to any wikis. Ask an admin to grant you access."}
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Legacy session without the rgx_dev_id cookie: fall back to the old
  // client-side access flow (EditorDashboardClient fetches /api/developers/me
  // and filters). WikiAccessGate/login stamps the cookie for next time.
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

  const summaries = wikis.map((wiki) => ({ wiki, lessonCount: null as number | null }))

  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-10">
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
