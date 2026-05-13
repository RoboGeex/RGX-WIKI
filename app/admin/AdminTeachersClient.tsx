"use client"

import { useEffect, useState } from 'react'

type Teacher = {
  id: string
  email: string
  name: string | null
  disabledAt: string | null
  createdAt: string
}

export default function AdminTeachersClient() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      setName('')
      setEmail('')
      setPassword('')
      await load()
    } catch (e: any) {
      setCreateError(e.message)
    } finally {
      setCreating(false)
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
      if (!res.ok) throw new Error(data.error || 'Failed')
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Create teacher</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-primary"
          />
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Password (≥ 8 chars)"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-primary"
          />
          <div className="sm:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create teacher'}
            </button>
            {createError && <span className="text-sm text-red-600">{createError}</span>}
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Created</th>
                  <th className="py-2 pr-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 text-gray-900">{t.name || '—'}</td>
                    <td className="py-2 pr-4 text-gray-700">{t.email}</td>
                    <td className="py-2 pr-4">
                      {t.disabledAt
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Disabled</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>
                      }
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => toggleDisabled(t)}
                        className={`text-sm ${t.disabledAt ? 'text-gray-500 hover:text-emerald-600' : 'text-gray-500 hover:text-red-600'}`}
                      >
                        {t.disabledAt ? 'Enable' : 'Disable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
