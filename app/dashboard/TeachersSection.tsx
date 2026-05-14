"use client"

import { useEffect, useState } from 'react'
import { Users, BookOpen, ShieldCheck, Clock, UserCheck, UserX } from 'lucide-react'

type Wiki = { slug: string; displayName: string }

type Teacher = {
  id: string
  email: string
  name: string | null
  assignedWikiSlugs: string[] | null
  disabledAt: string | null
  createdAt: string
  createdByName: string | null
  createdByEmail: string | null
  studentCount: number
  lastLoginAt: string | null
}

type AdminUser = {
  source: 'user'
  id: string
  email: string
  name: string | null
  disabledAt: string | null
  createdAt: string
  lastLoginAt: string | null
  activeSessions: number
}

type DevUser = {
  source: 'developer'
  id: string
  email: string
  name: string | null
  createdAt: string
  role: string
  activeSessions: null
  lastLoginAt: null
}

function Badge({ active }: { active: boolean }) {
  return active
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Active</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />Disabled</span>
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function TeachersSection({ wikis }: { wikis: Wiki[] }) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [developers, setDevelopers] = useState<DevUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedWikis, setSelectedWikis] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Wiki assignment editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWikis, setEditWikis] = useState<string[]>([])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [tRes, aRes] = await Promise.all([
        fetch('/api/admin/teachers'),
        fetch('/api/admin/admins'),
      ])
      const tData = await tRes.json()
      const aData = await aRes.json()
      if (!tRes.ok) throw new Error(tData.error || 'Failed to load teachers')
      setTeachers(tData.teachers || [])
      setAdmins(aData.admins || [])
      setDevelopers(aData.developers || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function toggleWiki(slug: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(slug) ? list.filter(s => s !== slug) : [...list, slug])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, assignedWikiSlugs: selectedWikis }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setName(''); setEmail(''); setPassword(''); setSelectedWikis([])
      await load()
    } catch (e: any) {
      setCreateError(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function saveWikiAssignment(id: string) {
    try {
      const res = await fetch(`/api/admin/teachers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedWikiSlugs: editWikis }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditingId(null)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function toggleDisabled(t: Teacher) {
    const disable = !t.disabledAt
    if (disable && !confirm(`Disable ${t.email}? They will be signed out immediately.`)) return
    try {
      const res = await fetch(`/api/admin/teachers/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: disable }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const totalStudents = teachers.reduce((s, t) => s + t.studentCount, 0)
  const activeTeachers = teachers.filter(t => !t.disabledAt).length
  const totalActiveSessions = admins.reduce((s, a) => s + (a.activeSessions || 0), 0)

  return (
    <div className="space-y-8">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: <UserCheck size={18} />, label: 'Active teachers', value: activeTeachers, color: 'text-emerald-600' },
          { icon: <Users size={18} />, label: 'Total students', value: totalStudents, color: 'text-blue-600' },
          { icon: <BookOpen size={18} />, label: 'Wikis', value: wikis.length, color: 'text-purple-600' },
          { icon: <ShieldCheck size={18} />, label: 'Admin sessions', value: totalActiveSessions, color: 'text-orange-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`${s.color} shrink-0`}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create teacher */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create teacher</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" placeholder="Full name" required value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:border-gray-400" />
            <input type="email" placeholder="Email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:border-gray-400" />
            <input type="text" placeholder="Password (≥ 8 chars)" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Assign wikis</p>
            <div className="flex flex-wrap gap-2">
              {wikis.map((w) => (
                <button key={w.slug} type="button"
                  onClick={() => toggleWiki(w.slug, selectedWikis, setSelectedWikis)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    selectedWikis.includes(w.slug)
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}>
                  {w.displayName}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={creating}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
              {creating ? 'Creating…' : 'Create teacher'}
            </button>
            {createError && <span className="text-sm text-red-600">{createError}</span>}
          </div>
        </form>
      </div>

      {/* Teacher list */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Teachers <span className="text-sm font-normal text-gray-400 ml-1">{teachers.length}</span>
          </h2>
          <button onClick={load} className="text-sm text-gray-500 hover:text-gray-900">↻ Refresh</button>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && teachers.length === 0 && (
          <p className="text-sm text-gray-500">No teachers yet.</p>
        )}

        {!loading && teachers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium w-6">#</th>
                  <th className="pb-2 pr-4 font-medium">Teacher</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Wikis</th>
                  <th className="pb-2 pr-4 font-medium">Students</th>
                  <th className="pb-2 pr-4 font-medium">Last login</th>
                  <th className="pb-2 pr-4 font-medium">Created by</th>
                  <th className="pb-2 pr-4 font-medium">Created</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teachers.map((t, i) => (
                  <tr key={t.id}>
                    <td className="py-3 pr-4 text-gray-400">{i + 1}</td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-gray-900">{t.name || '—'}</p>
                      <p className="text-xs text-gray-400">{t.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge active={!t.disabledAt} />
                    </td>
                    <td className="py-3 pr-4">
                      {editingId === t.id ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {wikis.map((w) => (
                              <button key={w.slug} type="button"
                                onClick={() => toggleWiki(w.slug, editWikis, setEditWikis)}
                                className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                                  editWikis.includes(w.slug)
                                    ? 'bg-gray-900 text-white border-gray-900'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                }`}>
                                {w.displayName}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => saveWikiAssignment(t.id)} className="text-xs px-2 py-1 rounded-lg bg-gray-900 text-white hover:bg-gray-700">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 items-center">
                          {(t.assignedWikiSlugs || []).length === 0
                            ? <span className="text-xs text-gray-400">None</span>
                            : (t.assignedWikiSlugs || []).map((slug) => {
                                const wiki = wikis.find(w => w.slug === slug)
                                return <span key={slug} className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100">{wiki?.displayName || slug}</span>
                              })
                          }
                          <button onClick={() => { setEditingId(t.id); setEditWikis(t.assignedWikiSlugs || []) }}
                            className="text-xs text-gray-400 hover:text-gray-700 underline ml-1">Edit</button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-gray-900">{t.studentCount}</span>
                      <span className="text-gray-400"> / 35</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock size={12} />
                        {timeAgo(t.lastLoginAt)}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {t.createdByName
                        ? <div>
                            <p className="text-gray-700 text-xs font-medium">{t.createdByName}</p>
                            <p className="text-gray-400 text-xs">{t.createdByEmail}</p>
                          </div>
                        : <span className="text-gray-400 text-xs">—</span>
                      }
                    </td>
                    <td className="py-3 pr-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <button onClick={() => toggleDisabled(t)}
                        className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                          t.disabledAt
                            ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            : 'border-red-200 text-red-600 hover:bg-red-50'
                        }`}>
                        {t.disabledAt ? 'Enable' : 'Disable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admins & developers */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Admins & editors</h2>

        {/* New-system admins */}
        {admins.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Admin accounts</p>
            <div className="divide-y divide-gray-50">
              {admins.map((a, i) => (
                <div key={a.id} className="py-3 flex items-center gap-4">
                  <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{a.name || '—'}</span>
                      <span className="text-xs text-gray-400">{a.email}</span>
                      <Badge active={!a.disabledAt} />
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                      <Clock size={11} /> Last login: {timeAgo(a.lastLoginAt)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.activeSessions > 0
                        ? <span className="text-emerald-600 font-medium">{a.activeSessions} active session{a.activeSessions > 1 ? 's' : ''}</span>
                        : 'No active sessions'}
                    </p>
                    <p className="text-xs text-gray-400">Since {new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legacy developers */}
        {developers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Editors (legacy)</p>
            <div className="divide-y divide-gray-50">
              {developers.map((d, i) => (
                <div key={d.id} className="py-3 flex items-center gap-4">
                  <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{d.name || '—'}</span>
                      <span className="text-xs text-gray-400">{d.email}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">{d.role}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">ID #{d.id}</p>
                    <p className="text-xs text-gray-400">Since {new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {admins.length === 0 && developers.length === 0 && !loading && (
          <p className="text-sm text-gray-500">No admin accounts found.</p>
        )}
      </div>

    </div>
  )
}
