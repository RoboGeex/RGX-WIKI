import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/lib/admin-auth'
import AdminNavbar from '../../../components/admin-navbar'
import StudentsPageClient from './StudentsPageClient'

export default async function StudentsPage() {
  let isAdmin = false
  try { await requireAdminAccess(); isAdmin = true } catch { /* */ }
  if (!isAdmin) redirect('/login?redirect=/dashboard/students')

  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <AdminNavbar />
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-12">
        <StudentsPageClient />
      </div>
    </div>
  )
}
