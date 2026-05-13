"use client"

import { useEffect, useState } from 'react'

type Wiki = { slug: string; displayName: string }
type Teacher = {
  id: string
  email: string
  name: string | null
  assignedWikiSlugs: string[] | null
  disabledAt: string | null
  createdAt: string
}

export default function TeachersSection({ wikis }: { wikis: Wiki[] }) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
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
      const res = await fetch('/api/admin/teachers')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setTeachers(data.teachers || [])
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

  return (
    <div className="space-y-8">
      {/* Create teacher */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create teacher</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text" placeholder="Name" required value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:border-gray-400"
            />
            <input
              type="email" placeholder="Email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:border-gray-400"
            />
            <input
              type="text" placeholder="Password (≥ 8 chars)" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-900 focus:outline-none focus:border-gray-400"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Assign wikis</p>
            <div className="flex flex-wrap gap-2">
              {wikis.map((w) => (
                <button
                  key={w.slug}
                  type="button"
                  onClick={() => toggleWiki(w.slug, selectedWikis, setSelectedWikis)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    selectedWikis.includes(w.slug)
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {w.displayName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit" disabled={creating}
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create teacher'}
            </button>
            {createError && <span className="text-sm text-red-600">{createError}</span>}
          </div>
        </form>
      </div>

      {/* Teacher list */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Teachers</h2>
          <button onClick={load} className="text-sm text-gray-500 hover:text-gray-900">Refresh</button>
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && teachers.length === 0 && (
          <p className="text-sm text-gray-500">No teachers yet.</p>
        )}

        {!loading && teachers.length > 0 && (
          <div className="divide-y divide-gray-100">
            {teachers.map((t, i) => (
              <div key={t.id} className="py-4 flex gap-4">
                <span className="text-sm text-gray-400 w-6 pt-0.5 shrink-0">{i + 1}</span>
                <div className="flex-1 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{t.name || '—'}</span>
                      <span className="text-gray-400 text-sm">{t.email}</span>
                      {t.disabledAt
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Disabled</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>
                      }
                    </div>

                    {/* Wiki assignment */}
                    {editingId === t.id ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {wikis.map((w) => (
                            <button
                              key={w.slug}
                              type="button"
                              onClick={() => toggleWiki(w.slug, editWikis, setEditWikis)}
                              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                                editWikis.includes(w.slug)
                                  ? 'bg-gray-900 text-white border-gray-900'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              {w.displayName}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveWikiAssignment(t.id)} className="text-xs px-3 py-1 rounded-lg bg-gray-900 text-white hover:bg-gray-700">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {(t.assignedWikiSlugs || []).length === 0
                          ? <span className="text-xs text-gray-400">No wikis assigned</span>
                          : (t.assignedWikiSlugs || []).map((slug) => {
                              const wiki = wikis.find(w => w.slug === slug)
                              return (
                                <span key={slug} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                                  {wiki?.displayName || slug}
                                </span>
                              )
                            })
                        }
                        <button
                          onClick={() => { setEditingId(t.id); setEditWikis(t.assignedWikiSlugs || []) }}
                          className="text-xs text-gray-400 hover:text-gray-700 underline"
                        >
                          Edit wikis
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-sm">
                    <span className="text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                    <button
                      onClick={() => toggleDisabled(t)}
                      className={t.disabledAt ? 'text-gray-500 hover:text-emerald-600' : 'text-gray-500 hover:text-red-600'}
                    >
                      {t.disabledAt ? 'Enable' : 'Disable'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
