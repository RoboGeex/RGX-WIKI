import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import TrackManager from '@/components/track-manager'

export const dynamic = 'force-dynamic'

export default async function TeacherTracksPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/teacher/tracks')
  if (user.role !== 'teacher' && user.role !== 'admin') redirect('/')
  return <main className="min-h-screen bg-[#f4f6f8] px-4 py-8 sm:px-6 lg:px-10"><div className="mx-auto max-w-6xl"><Link href="/teacher" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"><ArrowLeft size={16} /> Back to classes</Link><TrackManager audience={user.role === 'admin' ? 'admin' : 'teacher'} /></div></main>
}
