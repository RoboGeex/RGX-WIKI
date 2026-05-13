import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import AdminTeachersClient from './AdminTeachersClient'

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/admin')
  if (user.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
            <p className="text-sm text-gray-500">Signed in as {user.email}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="text-sm text-gray-500 hover:text-gray-900">Sign out</button>
          </form>
        </header>

        <AdminTeachersClient />
      </div>
    </div>
  )
}
