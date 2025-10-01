import AdminNavbar from '@/components/admin-navbar'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <AdminNavbar />
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-10 pt-20">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600">
            Dashboard content coming soon...
          </p>
        </header>

        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-gray-500">
            <p className="text-lg mb-2">Dashboard is under development</p>
            <p className="text-sm">New features will be added here in the future.</p>
          </div>
        </div>
      </div>
    </div>
  )
}