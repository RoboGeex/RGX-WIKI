"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, X, Search } from 'lucide-react'

type Wiki = { slug: string; displayName: string }
type Teacher = {
  id: string; email: string; name: string | null
  assignedWikiSlugs: string[] | null; disabledAt: string | null
  createdAt: string; createdByName: string | null; createdByEmail: string | null
  studentCount: number; lastLoginAt: string | null
}

function timeAgo(d: string | null) {
  if (!d) return 'Never'
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return days < 30 ? `${days}d ago` : new Date(d).toLocaleDateString()
}

// ── Create teacher dialog ────────────────────────────────────────────────────
function CreateTeacherDialog({ wikis, onClose, onCreated }: { wikis: Wiki[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedWikis, setSelectedWikis] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(slug: string) {
    setSelectedWikis(p => p.includes(slug) ? p.filter(s => s !== slug) : [...p, slug])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setError(null)
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, assignedWikiSlugs: selectedWikis }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onCreated(); onClose()
    } catch (e: any) { setError(e.message) }
    finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Add teacher</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-gray-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-gray-400 font-normal">(min 8 characters)</span>
            </label>
            <input type="text" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign wikis</label>
            <div className="flex flex-wrap gap-2">
              {wikis.map(w => (
                <button key={w.slug} type="button" onClick={() => toggle(w.slug)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${selectedWikis.includes(w.slug) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'}`}>
                  {w.displayName}
                </button>
              ))}
              {wikis.length === 0 && <p className="text-sm text-gray-400">No published wikis yet.</p>}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {creating ? 'Creating…' : 'Create teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Wiki edit inline ─────────────────────────────────────────────────────────
function WikiEditor({ teacher, wikis, onSave, onCancel }: { teacher: Teacher; wikis: Wiki[]; onSave: (slugs: string[]) => void; onCancel: () => void }) {
  const [sel, setSel] = useState(teacher.assignedWikiSlugs || [])
  const toggle = (slug: string) => setSel(p => p.includes(slug) ? p.filter(s => s !== slug) : [...p, slug])
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {wikis.map(w => (
          <button key={w.slug} type="button" onClick={() => toggle(w.slug)}
            className={`px-2.5 py-1 rounded text-sm border transition-colors ${sel.includes(w.slug) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-500'}`}>
            {w.displayName}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => onSave(sel)} className="text-sm px-3 py-1 rounded bg-gray-900 text-white hover:bg-gray-800">Save</button>
        <button onClick={onCancel} className="text-sm px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TeachersPageClient({ wikis }: { wikis: Wiki[] }) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterWiki, setFilterWiki] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/teachers')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setTeachers(data.teachers || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveWikis(id: string, slugs: string[]) {
    try {
      const res = await fetch(`/api/admin/teachers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignedWikiSlugs: slugs }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditingId(null); await load()
    } catch (e: any) { alert(e.message) }
  }

  async function toggleDisabled(t: Teacher) {
    const disable = !t.disabledAt
    if (disable && !confirm(`Disable ${t.email}? They will be signed out immediately.`)) return
    try {
      const res = await fetch(`/api/admin/teachers/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disabled: disable }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: any) { alert(e.message) }
  }

  const filtered = teachers.filter(t => {
    if (search && !t.name?.toLowerCase().includes(search.toLowerCase()) && !t.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filterWiki && !(t.assignedWikiSlugs || []).includes(filterWiki)) return false
    if (filterStatus === 'active' && t.disabledAt) return false
    if (filterStatus === 'disabled' && !t.disabledAt) return false
    return true
  })

  return (
    <div className="dashboard-list-scale space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft size={16} /> Back
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">Teachers</h1>
          {!loading && <span className="text-sm text-gray-400 font-normal">{teachers.length} total</span>}
        </div>
        <button onClick={() => setShowDialog(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors">
          <Plus size={15} /> Add teacher
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
            className="text-sm focus:outline-none text-gray-700 placeholder-gray-400 w-full" />
        </div>
        <div className="flex items-center gap-2">
          <select value={filterWiki} onChange={e => setFilterWiki(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:border-gray-500 bg-white">
            <option value="">All wikis</option>
            {wikis.map(w => <option key={w.slug} value={w.slug}>{w.displayName}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:border-gray-500 bg-white">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <button onClick={load} className="text-sm text-gray-400 hover:text-gray-700 px-2">↻</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading && <p className="p-8 text-sm text-gray-500 text-center">Loading…</p>}
        {error && <p className="p-8 text-sm text-red-600 text-center">{error}</p>}
        {!loading && filtered.length === 0 && <p className="p-8 text-sm text-gray-400 text-center">No teachers found.</p>}
        {!loading && filtered.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned wikis</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Students</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last login</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created by</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t, i) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-sm text-gray-400">{i + 1}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-900">{t.name || '—'}</p>
                    <p className="text-sm text-gray-500">{t.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    {t.disabledAt
                      ? <span className="inline-flex items-center gap-1.5 text-sm text-red-600"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Disabled</span>
                      : <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Active</span>
                    }
                  </td>
                  <td className="px-5 py-4">
                    {editingId === t.id
                      ? <WikiEditor teacher={t} wikis={wikis} onSave={s => saveWikis(t.id, s)} onCancel={() => setEditingId(null)} />
                      : <div className="flex flex-wrap gap-1.5 items-center">
                          {(t.assignedWikiSlugs || []).length === 0
                            ? <span className="text-sm text-gray-400">None</span>
                            : (t.assignedWikiSlugs || []).map(slug => {
                                const w = wikis.find(x => x.slug === slug)
                                return <span key={slug} className="px-2 py-0.5 rounded text-sm bg-gray-100 text-gray-700 border border-gray-200">{w?.displayName || slug}</span>
                              })
                          }
                          <button onClick={() => setEditingId(t.id)} className="text-sm text-blue-500 hover:text-blue-700 underline ml-1">Edit</button>
                        </div>
                    }
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700 font-medium">{t.studentCount}</td>
                  <td className="px-5 py-4 text-sm text-gray-500">{timeAgo(t.lastLoginAt)}</td>
                  <td className="px-5 py-4">
                    {t.createdByName
                      ? <div>
                          <p className="text-sm text-gray-700">{t.createdByName}</p>
                          <p className="text-sm text-gray-400">{t.createdByEmail}</p>
                        </div>
                      : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => toggleDisabled(t)}
                      className={`text-sm px-3 py-1 rounded border transition-colors ${t.disabledAt ? 'border-gray-300 text-gray-600 hover:bg-gray-50' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                      {t.disabledAt ? 'Enable' : 'Disable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showDialog && <CreateTeacherDialog wikis={wikis} onClose={() => setShowDialog(false)} onCreated={load} />}
    </div>
  )
}
