"use client"

import { useEffect, useState } from 'react'
import { Plus, Tag, Trash2, X } from 'lucide-react'
import { applyDeveloperHeader } from '@/components/editor/dev-identity'

type Category = {
  id: number
  name: string
  createdBy: string | null
  createdAt: string
}

export default function CategoriesCard() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isSuperadmin, setIsSuperadmin] = useState(false)

  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [deletingName, setDeletingName] = useState<string | null>(null)
  const [confirmName, setConfirmName] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/categories', {
        headers: applyDeveloperHeader() as HeadersInit,
      })
      const data = res.ok ? await res.json() : []
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    fetch('/api/developers/me', { headers: applyDeveloperHeader() as HeadersInit })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.developer?.role === 'superadmin') setIsSuperadmin(true)
      })
      .catch(() => {})
  }, [])

  const handleCreate = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: applyDeveloperHeader({ 'Content-Type': 'application/json' }) as HeadersInit,
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to create category')
      setNewName('')
      await load()
    } catch (e: any) {
      setCreateError(e?.message || 'Failed to create category')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (name: string) => {
    setDeletingName(name)
    try {
      const res = await fetch(`/api/categories?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: applyDeveloperHeader() as HeadersInit,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Failed to delete')
      }
      setConfirmName(null)
      await load()
    } catch (e) {
      // surface inline by keeping the confirm row; reset state so user can retry
      console.error(e)
    } finally {
      setDeletingName(null)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Tag size={15} className="text-slate-400" />
          <h3 className="text-[15px] font-bold text-slate-900">Wiki categories</h3>
        </div>
        {!loading && (
          <span className="text-xs font-medium text-slate-400">
            {categories.length} total
          </span>
        )}
      </div>

      {/* Add row (superadmin only) */}
      {isSuperadmin && (
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setCreateError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreate()
                }
              }}
              placeholder="New category name"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} />
              {creating ? 'Adding…' : 'Add'}
            </button>
          </div>
          {createError && (
            <p className="mt-1.5 text-xs text-red-600">{createError}</p>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="p-5 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="px-5 py-6 text-sm text-gray-400">
          No categories yet.
          {isSuperadmin ? ' Add one above.' : ' Ask a superadmin to add one.'}
        </div>
      ) : (
        <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {categories.map((cat) => {
            const isConfirming = confirmName === cat.name
            const isDeleting = deletingName === cat.name
            return (
              <li key={cat.id} className="px-5 py-2.5 flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {cat.name}
                </span>
                <span className="flex-1 text-xs text-gray-400 truncate">
                  added {new Date(cat.createdAt).toLocaleDateString()}
                </span>

                {isSuperadmin && (
                  isConfirming ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.name)}
                        disabled={isDeleting}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting…' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmName(null)}
                        disabled={isDeleting}
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmName(cat.name)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
