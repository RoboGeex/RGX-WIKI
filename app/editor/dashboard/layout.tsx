import WikiSidebar from '@/components/editor/WikiSidebar'
import { getEditorSidebarData } from '@/lib/editor-wikis'

// The wiki side panel lives in this layout (not the pages) so it persists
// across navigations between wikis — only the lessons area re-renders.
export default async function EditorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sidebar = await getEditorSidebarData()

  return (
    <div className="flex min-h-screen bg-[#eef2f1]">
      <WikiSidebar wikis={sidebar.wikis} isSuperadmin={sidebar.isSuperadmin} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
