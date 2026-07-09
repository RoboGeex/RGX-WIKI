import AdminNavbar from '@/components/admin-navbar'
import WikiSidebar from '@/components/editor/WikiSidebar'
import { getEditorSidebarData } from '@/lib/editor-wikis'

// The top bar and wiki side panel live in this layout (not the pages) so
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
      <AdminNavbar />
      <div className="flex pt-[72px]">
        <WikiSidebar wikis={sidebar.wikis} isSuperadmin={sidebar.isSuperadmin} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
