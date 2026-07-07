"use client"

import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, ChevronLeft, Plus, X, Search } from 'lucide-react'

type Wiki = { slug: string; displayName: string }
type Teacher = {
  id: string; email: string; name: string | null; avatarUrl: string | null
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

function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  const parts = source.split(/\s+/)
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function DirectoryAvatar({ name, email, src }: { name: string | null; email: string; src?: string | null }) {
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#ECEEF2] to-[#D7DAE1] text-base font-bold text-[#8A8F99] shadow-inner">
      {src ? (
        <Image src={src} alt={name || email} fill sizes="64px" className="object-cover" />
      ) : (
        <>
          <div className="absolute top-4 h-5 w-5 rounded-full bg-[#9EA3AD]" />
          <div className="absolute bottom-2 h-7 w-11 rounded-t-full bg-[#9EA3AD]" />
          <span className="sr-only">{initials(name, email)}</span>
        </>
      )}
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-wide text-[#30323A]">{children}</p>
}

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, assignedWikiSlugs: selectedWikis }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">Add teacher</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-base font-medium text-gray-700">Full name</span>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-gray-500 focus:outline-none" />
            </label>
            <label>
              <span className="mb-1 block text-base font-medium text-gray-700">Email</span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-gray-500 focus:outline-none" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-base font-medium text-gray-700">Password <span className="font-normal text-gray-400">(min 8 characters)</span></span>
            <input type="text" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-gray-500 focus:outline-none" />
          </label>
          <div>
            <p className="mb-2 text-base font-medium text-gray-700">Assign wikis</p>
            <div className="flex flex-wrap gap-2">
              {wikis.map(w => (
                <button key={w.slug} type="button" onClick={() => toggle(w.slug)}
                  className={`rounded-lg border px-3 py-1.5 text-base transition-colors ${selectedWikis.includes(w.slug) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-500'}`}>
                  {w.displayName}
                </button>
              ))}
              {wikis.length === 0 && <p className="text-base text-gray-400">No published wikis yet.</p>}
            </div>
          </div>
          {error && <p className="text-base text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-base text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={creating} className="rounded-lg bg-gray-900 px-4 py-2 text-base font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              {creating ? 'Creating...' : 'Create teacher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function WikiEditor({ teacher, wikis, onSave, onCancel }: { teacher: Teacher; wikis: Wiki[]; onSave: (slugs: string[]) => void; onCancel: () => void }) {
  const [sel, setSel] = useState(teacher.assignedWikiSlugs || [])
  const toggle = (slug: string) => setSel(p => p.includes(slug) ? p.filter(s => s !== slug) : [...p, slug])
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-[#343840]">Choose assigned wikis</p>
        <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
        {wikis.map(w => (
          <button key={w.slug} type="button" onClick={() => toggle(w.slug)}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors ${sel.includes(w.slug) ? 'border-[#111318] bg-[#111318] text-white' : 'border-[#D4D7DE] bg-white text-[#30343B] hover:border-[#9EA3AD] hover:bg-[#F8F9FB]'}`}>
            <span className="truncate">{w.displayName}</span>
            <span className={`ml-3 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${sel.includes(w.slug) ? 'border-white bg-white text-[#111318]' : 'border-[#C9CDD5] text-transparent'}`}>
              <Check size={10} />
            </span>
          </button>
        ))}
        {wikis.length === 0 && (
          <p className="rounded-lg border border-[#D4D7DE] bg-[#F8F9FB] px-3 py-5 text-center text-sm text-[#6C7078]">
            No published wikis yet.
          </p>
        )}
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-[#E4E6EB] pt-4">
        <button onClick={onCancel} className="rounded-lg border border-[#C9CDD5] bg-white px-4 py-2 text-sm font-medium text-[#4B5059] hover:bg-[#F8F9FB]">Cancel</button>
        <button onClick={() => onSave(sel)} className="rounded-lg bg-[#111318] px-4 py-2 text-sm font-semibold text-white hover:bg-black">Save changes</button>
      </div>
    </div>
  )
}

function AssignedWikisDialog({
  teacher,
  wikis,
  editing,
  onEdit,
  onSave,
  onClose,
}: {
  teacher: Teacher
  wikis: Wiki[]
  editing: boolean
  onEdit: () => void
  onSave: (slugs: string[]) => void
  onClose: () => void
}) {
  const assigned = teacher.assignedWikiSlugs || []
  const assignedWikis = assigned.map(slug => wikis.find(w => w.slug === slug)?.displayName || slug)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-[#D7DAE0] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E4E6EB] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <DirectoryAvatar name={teacher.name} email={teacher.email} src={teacher.avatarUrl} />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-[#070A12]">Assigned wikis</h2>
                <p className="truncate text-sm text-[#60656F]">{teacher.name || teacher.email}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#8A8F99] hover:bg-[#F2F3F6] hover:text-[#111318]" aria-label="Close assigned wikis dialog">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          {editing ? (
            <WikiEditor teacher={teacher} wikis={wikis} onSave={onSave} onCancel={onClose} />
          ) : assignedWikis.length > 0 ? (
            <div>
              <div className="mb-3 inline-flex rounded-full bg-[#F2F3F6] px-2.5 py-1 text-xs font-semibold text-[#4B5059]">
                {assignedWikis.length} assigned
              </div>
              <div className="space-y-2">
              {assignedWikis.map(name => (
                <div key={name} className="flex items-center gap-3 rounded-lg border border-[#D9DCE2] bg-[#FAFBFC] px-3 py-2.5">
                  <span className="h-2 w-2 rounded-full bg-[#56BD68]" />
                  <span className="min-w-0 truncate text-sm font-medium text-[#111318]">{name}</span>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-[#C9CDD5] bg-[#FAFBFC] px-4 py-8 text-center text-sm text-[#60656F]">
              No wikis assigned.
            </p>
          )}
        </div>

        {!editing && (
          <div className="flex justify-end gap-2 border-t border-[#E4E6EB] bg-[#FAFBFC] px-5 py-4">
            <button onClick={onClose} className="rounded-lg border border-[#C9CDD5] bg-white px-4 py-2 text-sm font-medium text-[#4B5059] hover:bg-[#F2F3F6]">
              Close
            </button>
            <button onClick={onEdit} className="rounded-lg bg-[#111318] px-4 py-2 text-sm font-semibold text-white hover:bg-black">
              Edit assignment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TeachersPageClient({ wikis }: { wikis: Wiki[] }) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [assignedDialogTeacher, setAssignedDialogTeacher] = useState<Teacher | null>(null)
  const [search, setSearch] = useState('')
  const [filterWiki, setFilterWiki] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/teachers')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setTeachers(data.teachers || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveWikis(id: string, slugs: string[]) {
    try {
      const res = await fetch(`/api/admin/teachers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assignedWikiSlugs: slugs }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEditingId(null)
      setAssignedDialogTeacher(null)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function toggleDisabled(t: Teacher) {
    const disable = !t.disabledAt
    if (disable && !confirm(`Disable ${t.email}? They will be signed out immediately.`)) return
    try {
      const res = await fetch(`/api/admin/teachers/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disabled: disable }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const filtered = teachers.filter(t => {
    if (search && !t.name?.toLowerCase().includes(search.toLowerCase()) && !t.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filterWiki && !(t.assignedWikiSlugs || []).includes(filterWiki)) return false
    if (filterStatus === 'active' && t.disabledAt) return false
    if (filterStatus === 'disabled' && !t.disabledAt) return false
    return true
  })

  return (
    <div className="dashboard-list-scale mx-auto max-w-[1224px] space-y-6 text-[#070A12]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D8DADF] pb-6">
        <div>
          <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-base font-medium text-[#6C7078] hover:text-[#070A12]">
            <ChevronLeft size={18} /> Back
          </Link>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.01em] text-[#070A12]">Teacher Directory</h1>
          <p className="mt-2 text-lg text-[#2F333B]">{teachers.length} total</p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="inline-flex items-center gap-3 rounded-lg border border-[#C9CCD3] bg-white px-5 py-3 text-lg font-semibold text-[#070A12] shadow-[0_3px_8px_rgba(15,23,42,0.16)] transition hover:bg-[#F8F9FB]"
        >
          <Plus size={22} /> Add Teacher
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_224px_224px]">
        <label className="flex h-[46px] items-center gap-3 rounded-lg border border-[#C6CAD2] bg-white px-3 shadow-[0_2px_7px_rgba(15,23,42,0.08)]">
          <Search size={21} className="text-[#757A84]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-lg text-[#111318] placeholder:text-[#777B84] focus:outline-none"
          />
        </label>
        <select value={filterWiki} onChange={e => setFilterWiki(e.target.value)}
          className="h-[46px] rounded-lg border border-[#C6CAD2] bg-white px-4 text-lg text-[#111318] shadow-[0_2px_7px_rgba(15,23,42,0.08)] focus:outline-none">
          <option value="">All wikis</option>
          {wikis.map(w => <option key={w.slug} value={w.slug}>{w.displayName}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="h-[46px] rounded-lg border border-[#C6CAD2] bg-white px-4 text-lg text-[#111318] shadow-[0_2px_7px_rgba(15,23,42,0.08)] focus:outline-none">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div className="space-y-6">
        {loading && <p className="rounded-xl border border-[#D9DCE2] bg-white p-8 text-center text-lg text-[#60656F]">Loading...</p>}
        {error && <p className="rounded-xl border border-red-200 bg-white p-8 text-center text-lg text-red-600">{error}</p>}
        {!loading && filtered.length === 0 && <p className="rounded-xl border border-[#D9DCE2] bg-white p-8 text-center text-lg text-[#60656F]">No teachers found.</p>}
        {!loading && filtered.map(t => {
          const assigned = t.assignedWikiSlugs || []
          return (
            <section key={t.id} className="rounded-xl border border-[#D0D3DA] bg-white px-5 py-6 shadow-[0_6px_18px_rgba(15,23,42,0.14)]">
              <div className="grid items-center gap-6 lg:grid-cols-[300px_150px_88px_110px_166px_112px_100px]">
                <div className="flex items-center gap-4">
                  <DirectoryAvatar name={t.name} email={t.email} src={t.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold text-[#05070D]">{t.name || 'Unnamed'}</p>
                    <p className="truncate text-base text-[#3F434B]">{t.email}</p>
                  </div>
                </div>

                <div>
                  <FieldLabel>Assigned Wikis</FieldLabel>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setAssignedDialogTeacher(t)
                    }}
                    className="mt-2 inline-flex items-center rounded-lg border border-[#C9CCD3] bg-[#F2F3F6] px-3 py-1.5 text-base font-semibold text-[#070A12] shadow-inner hover:bg-[#E9EBF0]"
                  >
                    {assigned.length} Assigned
                  </button>
                </div>

                <div>
                  <FieldLabel>Students</FieldLabel>
                  <p className="mt-2 text-lg font-semibold text-[#070A12]">{t.studentCount}</p>
                </div>

                <div>
                  <FieldLabel>Last Login</FieldLabel>
                  <p className="mt-2 text-lg text-[#070A12]">{timeAgo(t.lastLoginAt)}</p>
                </div>

                <div>
                  <FieldLabel>Created By</FieldLabel>
                  {t.createdByName ? (
                    <div className="mt-2 leading-snug">
                      <p className="text-lg font-semibold text-[#070A12]">{t.createdByName}</p>
                      <p className="truncate text-base text-[#3F434B]">{t.createdByEmail}</p>
                      <p className="text-base text-[#3F434B]">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                  ) : <p className="mt-2 text-lg font-semibold text-[#070A12]">-</p>}
                </div>

                <div>
                  <FieldLabel>Joined</FieldLabel>
                  <p className="mt-2 whitespace-nowrap text-lg text-[#070A12]">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center justify-end gap-5">
                  <span className={`h-5 w-5 rounded-full ${t.disabledAt ? 'bg-red-400' : 'bg-[#56BD68]'} shadow-[0_1px_5px_rgba(22,163,74,0.35)]`} />
                  <button
                    onClick={() => toggleDisabled(t)}
                    className="rounded-lg border border-[#C9CCD3] bg-white px-5 py-2.5 text-lg font-medium text-[#070A12] shadow-sm transition hover:bg-[#F8F9FB]"
                  >
                    {t.disabledAt ? 'Enable' : 'Disable'}
                  </button>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {showDialog && <CreateTeacherDialog wikis={wikis} onClose={() => setShowDialog(false)} onCreated={load} />}
      {assignedDialogTeacher && (
        <AssignedWikisDialog
          teacher={assignedDialogTeacher}
          wikis={wikis}
          editing={editingId === assignedDialogTeacher.id}
          onEdit={() => setEditingId(assignedDialogTeacher.id)}
          onSave={s => saveWikis(assignedDialogTeacher.id, s)}
          onClose={() => {
            setEditingId(null)
            setAssignedDialogTeacher(null)
          }}
        />
      )}
    </div>
  )
}
