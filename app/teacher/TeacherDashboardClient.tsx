"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Home, Layout, LogOut, ChevronLeft } from 'lucide-react'

function Avatar({ name, email, size = 'sm' }: { name: string | null; email: string; size?: 'sm' | 'md' }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase()
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm' }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center font-bold text-white shrink-0`}>
      {initials}
    </div>
  )
}

type Wiki = { slug: string; displayName: string }
type LinkInfo = {
  id: string
  token: string
  isActive: boolean
  createdAt: string
  _count: { enrollments: number }
}
type Student = {
  enrollmentId: string
  joinedAt: string
  student: { id: string; email: string; name: string | null }
  link: { id: string; isActive: boolean }
  progress: { completed: number; in_progress: number }
}

type Props = {
  wikis: Wiki[]
  user: { name: string | null; email: string }
}

export default function TeacherDashboardClient({ wikis, user }: Props) {
  const [wikiSlug, setWikiSlug] = useState(wikis[0]?.slug || '')
  const [links, setLinks] = useState<LinkInfo[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const activeLink = links.find((l) => l.isActive) || null

  const load = useCallback(async () => {
    if (!wikiSlug) return
    setLoading(true)
    setError(null)
    try {
      const [linksRes, studentsRes] = await Promise.all([
        fetch(`/api/teacher/links?wikiSlug=${wikiSlug}`),
        fetch(`/api/teacher/students?wikiSlug=${wikiSlug}`),
      ])
      const linksData = await linksRes.json()
      const studentsData = await studentsRes.json()
      if (!linksRes.ok) throw new Error(linksData.error)
      if (!studentsRes.ok) throw new Error(studentsData.error)
      setLinks(linksData.links || [])
      setStudents(studentsData.students || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [wikiSlug])

  useEffect(() => { load() }, [load])

  async function generateLink() {
    if (activeLink && !confirm('This will replace the current active link. Students already enrolled keep access — new students will use the new link. Continue?')) return
    try {
      const res = await fetch('/api/teacher/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wikiSlug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function toggleLink(link: LinkInfo) {
    const disable = link.isActive
    if (disable && !confirm('Turning this link off will revoke access for ALL students enrolled through it. Continue?')) return
    try {
      const res = await fetch(`/api/teacher/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !disable }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function removeStudent(s: Student) {
    if (!confirm(`Remove ${s.student.name || s.student.email}? They will lose access immediately.`)) return
    try {
      const res = await fetch(`/api/teacher/students/${s.enrollmentId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/join/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const joinUrl = activeLink
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${activeLink.token}`
    : null

  const displayName = user.name || user.email

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-[#1e1e1e] w-full border-b border-transparent fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={184} height={64} priority className="h-12 w-auto" />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/home"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Home size={16} />
              <span className="text-sm font-medium">Home</span>
            </Link>

            <Link
              href="/teacher"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-primary bg-primary/10 border border-primary/20 transition-colors"
            >
              <Layout size={16} />
              <span className="text-sm font-medium">My classes</span>
            </Link>

            <div className="flex items-center gap-2 px-3 py-2">
              <Avatar name={user.name} email={user.email} size="sm" />
              <span className="text-sm text-white/70 hidden sm:block">{displayName}</span>
            </div>

            <form action="/api/auth/logout" method="post">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                <LogOut size={16} />
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-8 space-y-6">

        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">My classes</h1>
        </div>

        {/* Course tabs */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {wikis.map((w) => (
              <button
                key={w.slug}
                onClick={() => setWikiSlug(w.slug)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  wikiSlug === w.slug
                    ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
                }`}
              >
                {w.displayName}
              </button>
            ))}
          </div>
          <button onClick={load} className="px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-gray-700 border border-transparent hover:border-gray-200 transition-all shrink-0">
            ↻ Refresh
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Share link */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Share link</h2>
            <span className="text-sm text-gray-500">{students.length} / 35 students</span>
          </div>

          {activeLink ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-700 flex-1 truncate font-mono">{joinUrl}</span>
                <button onClick={() => copyLink(activeLink.token)} className="text-sm text-primary hover:opacity-80 shrink-0">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleLink(activeLink)}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:opacity-90"
                >
                  Turn off link
                </button>
                <button
                  onClick={generateLink}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">No active link. Generate one to share with students.</p>
              <button onClick={generateLink} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90">
                Generate link
              </button>
            </div>
          )}
        </div>

        {/* Students */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Students</h2>

          {loading && <p className="text-sm text-gray-500">Loading…</p>}

          {!loading && students.length === 0 && (
            <p className="text-sm text-gray-500">No students enrolled yet.</p>
          )}

          {!loading && students.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="py-2 pr-4 font-medium w-8">#</th>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Email</th>
                    <th className="py-2 pr-4 font-medium">Joined</th>
                    <th className="py-2 pr-4 font-medium">Progress</th>
                    <th className="py-2 pr-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.enrollmentId} className="border-b border-gray-50">
                      <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                      <td className="py-2 pr-4 text-gray-900">{s.student.name || '—'}</td>
                      <td className="py-2 pr-4 text-gray-700">{s.student.email}</td>
                      <td className="py-2 pr-4 text-gray-500">{new Date(s.joinedAt).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{s.progress.completed} done</span>
                        {s.progress.in_progress > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 ml-1">{s.progress.in_progress} in progress</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <button onClick={() => removeStudent(s)} className="text-sm text-gray-400 hover:text-red-600 transition-colors">
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
