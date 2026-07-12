import WikiSidebar from '@/components/editor/WikiSidebar'
import { getEditorSidebarData } from '@/lib/editor-wikis'

// The workspace sidebar and wiki side panel live in this layout (not the pages) so
// they persist across navigations between wikis — only the lessons area
// re-renders.
export default async function EditorDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sidebar = await getEditorSidebarData()

  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <div className="flex pb-24 pt-[68px] lg:ml-[272px] lg:pb-0 lg:pt-0">
        <WikiSidebar wikis={sidebar.wikis} isSuperadmin={sidebar.isSuperadmin} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
