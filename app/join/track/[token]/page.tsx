"use client"

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Route } from 'lucide-react'

type LinkInfo = {
  track: { id: string; name: string; description: string | null; wikis: { slug: string; displayName: string }[] }
  inviter: { name: string | null; email: string | null }
  isActive: boolean
  spotsLeft: number
}

export default function JoinTrackPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [info, setInfo] = useState<LinkInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  const join = useCallback(async () => {
    setJoining(true)
    setError(null)
    try {
      const response = await fetch(`/api/join/track/${params.token}`, { method: 'POST' })
      const data = await response.json()
      if (response.status === 401) {
        router.push(`/login?redirect=/join/track/${params.token}`)
        return
      }
      if (!response.ok) throw new Error(data.error || 'Failed to join track')
      router.push('/home')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to join track')
      setJoining(false)
    }
  }, [params.token, router])

  useEffect(() => {
    Promise.all([
      fetch(`/api/join/track/${params.token}`).then((response) => response.json()),
      fetch('/api/auth/me').then((response) => response.json()),
    ]).then(([linkData, me]) => {
      if (linkData.error) { setError(linkData.error); return }
      setInfo(linkData)
      if (me?.user?.role === 'student' && linkData.isActive && linkData.spotsLeft > 0) void join()
    }).catch(() => setError('Failed to load invite'))
  }, [join, params.token])

  if (!info && !error) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Loading invite…</div>
  if (!info) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><div className="text-center"><h1 className="text-xl font-bold text-slate-900">Track invite unavailable</h1><p className="mt-2 text-sm text-red-600">{error}</p></div></div>
  if (!info.isActive) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><div className="text-center"><h1 className="text-xl font-bold text-slate-900">This link is closed</h1><p className="mt-2 text-sm text-slate-500">Ask the teacher or administrator for a new track link.</p></div></div>

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FDF6F4] to-slate-100 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white bg-white shadow-2xl">
        <div className="bg-[#1A1110] p-7 text-white"><Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={160} height={56} className="h-11 w-auto" /><div className="mt-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/45"><Route size={16} /> Track invitation</div><h1 className="mt-2 text-3xl font-extrabold">{info.track.name}</h1>{info.track.description && <p className="mt-2 leading-6 text-white/60">{info.track.description}</p>}</div>
        <div className="p-7"><p className="text-sm font-semibold text-slate-500">Invited by {info.inviter.name || info.inviter.email || 'RoboGeex Academy'}</p><div className="mt-5 space-y-2">{info.track.wikis.map((wiki, index) => <div key={wiki.slug} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-extrabold text-[#E94335]">{index + 1}</span><span className="font-bold text-slate-800">{wiki.displayName}</span></div>)}</div>{error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}<button onClick={() => void join()} disabled={joining || info.spotsLeft === 0} className="mt-6 w-full rounded-xl bg-[#E94335] py-3 font-bold text-white transition hover:bg-[#d83b2e] disabled:opacity-50">{joining ? 'Joining track…' : info.spotsLeft === 0 ? 'Track is full' : 'Join track'}</button><p className="mt-3 text-center text-xs text-slate-400">You’ll be asked to sign in or create a student account if needed.</p></div>
      </div>
    </main>
  )
}
