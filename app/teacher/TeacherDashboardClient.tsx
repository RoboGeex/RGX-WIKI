"use client"

import { useEffect, useState, useCallback } from 'react'

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

export default function TeacherDashboardClient({ wikis }: { wikis: Wiki[] }) {
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

  const joinUrl = activeLink ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${activeLink.token}` : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Course</label>
        <select
          value={wikiSlug}
          onChange={(e) => setWikiSlug(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none"
        >
          {wikis.map((w) => (
            <option key={w.slug} value={w.slug}>{w.displayName}</option>
          ))}
        </select>
        <button onClick={load} className="text-sm text-gray-500 hover:text-gray-900">Refresh</button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

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
                    <td className="py-2 pr-4 text-gray-400 text-sm">{i + 1}</td>
                    <td className="py-2 pr-4 text-gray-900">{s.student.name || '—'}</td>
                    <td className="py-2 pr-4 text-gray-700">{s.student.email}</td>
                    <td className="py-2 pr-4 text-gray-500">{new Date(s.joinedAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-4 text-gray-700">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{s.progress.completed} done</span>
                      {s.progress.in_progress > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 ml-1">{s.progress.in_progress} in progress</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <button onClick={() => removeStudent(s)} className="text-sm text-red-600 hover:opacity-80">
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
  )
}
