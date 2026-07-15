import { redirect } from 'next/navigation'
import { requireAdminAccess } from '@/lib/admin-auth'
import TrackManager from '@/components/track-manager'

export const dynamic = 'force-dynamic'

export default async function AdminTracksPage() {
  try { await requireAdminAccess() } catch { redirect('/login?redirect=/dashboard/tracks') }
  return <main className="min-h-screen bg-[#f4f6f8] px-4 pb-28 pt-[88px] sm:px-6 lg:ml-[272px] lg:w-[calc(100%-272px)] lg:px-10 lg:pb-16 lg:pt-10"><div className="mx-auto max-w-[1280px]"><TrackManager audience="admin" /></div></main>
}
