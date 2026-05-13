import AdminNavbar from '../../components/admin-navbar'
import EditorAuthGate from '@/components/editor/EditorAuthGate'
import { prisma } from '@/lib/prisma'
import TeachersSection from './TeachersSection'

async function getWikis() {
  try {
    return await prisma.wiki.findMany({
      where: { isPublished: true },
      orderBy: { displayName: 'asc' },
      select: { slug: true, displayName: true },
    })
  } catch {
    return []
  }
}

export default async function DashboardPage() {
  const wikis = await getWikis()

  return (
    <EditorAuthGate>
      <div className="min-h-screen bg-[#eef2f1]">
        <AdminNavbar />
        <div className="mx-auto max-w-5xl px-6 py-12 space-y-10 pt-20">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600">Manage teachers and their wiki access.</p>
          </header>

          <TeachersSection wikis={wikis} />
        </div>
      </div>
    </EditorAuthGate>
  )
}
