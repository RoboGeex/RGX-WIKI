import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/lib/admin-auth'
import AdminNavbar from '../../components/admin-navbar'
import DashboardHome from './DashboardHome'

export default async function DashboardPage() {
  let isAdmin = false
  try {
    await requireAdminAccess()
    isAdmin = true
  } catch { /* not authorised */ }

  if (!isAdmin) redirect('/login?redirect=/dashboard')

  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <AdminNavbar />
      <div className="mx-auto max-w-5xl px-6 pt-24 pb-12 space-y-2">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your platform.</p>
        </div>
        <DashboardHome />
      </div>
    </div>
  )
}
