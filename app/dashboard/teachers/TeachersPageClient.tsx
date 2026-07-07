"use client"

import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, ChevronLeft, Plus, X, Search, GraduationCap } from 'lucide-react'

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
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] text-lg font-bold text-white shadow-lg shadow-[#E23B2E]/25">
      {src ? (
        <Image src={src} alt={name || email} fill sizes="64px" className="object-cover" />
      ) : (
        <span>{initials(name, email)}</span>
      )}
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#B08981]">{children}</p>
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
    <div className="rgx-dash fixed inset-0 z-50 flex items-center justify-center bg-[#1A1110]/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[1.5rem] border border-[#F2E1DD] bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#F3E7E4] px-6 py-5">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#1A1110]">Add teacher</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#B08981] hover:bg-[#FBF3F1] hover:text-[#1A1110]"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[15px] font-bold text-[#6B4F4A]">Full name</span>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full rounded-xl border border-[#EBD9D5] px-3.5 py-2.5 text-base text-[#1A1110] focus:border-[#E23B2E] focus:outline-none focus:ring-2 focus:ring-[#F0523F]/20" />
            </label>
            <label>
              <span className="mb-1.5 block text-[15px] font-bold text-[#6B4F4A]">Email</span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#EBD9D5] px-3.5 py-2.5 text-base text-[#1A1110] focus:border-[#E23B2E] focus:outline-none focus:ring-2 focus:ring-[#F0523F]/20" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[15px] font-bold text-[#6B4F4A]">Password <span className="font-medium text-[#B08981]">(min 8 characters)</span></span>
            <input type="text" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#EBD9D5] px-3.5 py-2.5 text-base text-[#1A1110] focus:border-[#E23B2E] focus:outline-none focus:ring-2 focus:ring-[#F0523F]/20" />
          </label>
          <div>
            <p className="mb-2.5 text-[15px] font-bold text-[#6B4F4A]">Assign wikis</p>
            <div className="flex flex-wrap gap-2">
              {wikis.map(w => (
                <button key={w.slug} type="button" onClick={() => toggle(w.slug)}
                  className={`rounded-xl border px-3.5 py-2 text-[15px] font-semibold transition-colors ${selectedWikis.includes(w.slug) ? 'border-[#1A1110] bg-[#1A1110] text-white' : 'border-[#EBD9D5] bg-white text-[#6B4F4A] hover:border-[#E23B2E]/50'}`}>
                  {w.displayName}
                </button>
              ))}
              {wikis.length === 0 && <p className="text-base text-[#B08981]">No published wikis yet.</p>}
            </div>
          </div>
          {error && <p className="text-base font-medium text-[#E23B2E]">{error}</p>}
          <div className="flex justify-end gap-2.5 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-[#EBD9D5] px-4 py-2.5 text-base font-semibold text-[#6B4F4A] hover:bg-[#FBF3F1]">Cancel</button>
            <button type="submit" disabled={creating} className="rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] px-5 py-2.5 text-base font-bold text-white shadow-lg shadow-[#E23B2E]/25 hover:-translate-y-0.5 transition-transform disabled:opacity-50">
              {creating ? 'Creating…' : 'Create teacher'}
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
        <p className="mb-2 text-[15px] font-bold text-[#6B4F4A]">Choose assigned wikis</p>
        <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
        {wikis.map(w => (
          <button key={w.slug} type="button" onClick={() => toggle(w.slug)}
            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-[15px] font-semibold transition-colors ${sel.includes(w.slug) ? 'border-[#1A1110] bg-[#1A1110] text-white' : 'border-[#EBD9D5] bg-white text-[#6B4F4A] hover:border-[#E23B2E]/50 hover:bg-[#FBF3F1]'}`}>
            <span className="truncate">{w.displayName}</span>
            <span className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${sel.includes(w.slug) ? 'border-white bg-white text-[#1A1110]' : 'border-[#DEC7C2] text-transparent'}`}>
              <Check size={12} />
            </span>
          </button>
        ))}
        {wikis.length === 0 && (
          <p className="rounded-xl border border-[#EBD9D5] bg-[#FBF3F1] px-3 py-5 text-center text-base text-[#8B6B65]">
            No published wikis yet.
          </p>
        )}
        </div>
      </div>
      <div className="flex justify-end gap-2.5 border-t border-[#F3E7E4] pt-4">
        <button onClick={onCancel} className="rounded-xl border border-[#EBD9D5] bg-white px-4 py-2.5 text-base font-semibold text-[#6B4F4A] hover:bg-[#FBF3F1]">Cancel</button>
        <button onClick={() => onSave(sel)} className="rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] px-5 py-2.5 text-base font-bold text-white shadow-lg shadow-[#E23B2E]/25 hover:-translate-y-0.5 transition-transform">Save changes</button>
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
    <div className="rgx-dash fixed inset-0 z-50 flex items-center justify-center bg-[#1A1110]/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[460px] overflow-hidden rounded-[1.5rem] border border-[#F2E1DD] bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-[#F3E7E4] px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <DirectoryAvatar name={teacher.name} email={teacher.email} src={teacher.avatarUrl} />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-extrabold tracking-tight text-[#1A1110]">Assigned wikis</h2>
                <p className="truncate text-base text-[#8B6B65]">{teacher.name || teacher.email}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#B08981] hover:bg-[#FBF3F1] hover:text-[#1A1110]" aria-label="Close assigned wikis dialog">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5">
          {editing ? (
            <WikiEditor teacher={teacher} wikis={wikis} onSave={onSave} onCancel={onClose} />
          ) : assignedWikis.length > 0 ? (
            <div>
              <div className="mb-3 inline-flex rounded-full bg-[#FDEDEA] px-3 py-1 text-sm font-bold text-[#E23B2E]">
                {assignedWikis.length} assigned
              </div>
              <div className="space-y-2">
              {assignedWikis.map(name => (
                <div key={name} className="flex items-center gap-3 rounded-xl border border-[#EBD9D5] bg-[#FBF3F1] px-3.5 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="min-w-0 truncate text-base font-semibold text-[#1A1110]">{name}</span>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-[#DEC7C2] bg-[#FBF3F1] px-4 py-8 text-center text-base text-[#8B6B65]">
              No wikis assigned.
            </p>
          )}
        </div>

        {!editing && (
          <div className="flex justify-end gap-2.5 border-t border-[#F3E7E4] bg-[#FCF6F5] px-6 py-4">
            <button onClick={onClose} className="rounded-xl border border-[#EBD9D5] bg-white px-4 py-2.5 text-base font-semibold text-[#6B4F4A] hover:bg-[#FBF3F1]">
              Close
            </button>
            <button onClick={onEdit} className="rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] px-5 py-2.5 text-base font-bold text-white shadow-lg shadow-[#E23B2E]/25 hover:-translate-y-0.5 transition-transform">
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
    <div className="mx-auto max-w-[1224px] space-y-7 text-[#1A1110]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="mb-3 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#B08981] hover:text-[#E23B2E] transition-colors">
            <ChevronLeft size={18} /> Back to dashboard
          </Link>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-[#1A1110]">Teacher directory</h1>
          <p className="mt-2 text-lg text-[#8B6B65]"><span className="font-bold text-[#1A1110]">{teachers.length}</span> teacher{teachers.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] px-5 py-3 text-[15px] font-bold text-white shadow-lg shadow-[#E23B2E]/25 transition-transform hover:-translate-y-0.5"
        >
          <Plus size={20} /> Add teacher
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_224px_224px]">
        <label className="flex h-[52px] items-center gap-3 rounded-xl border border-[#EBD9D5] bg-white px-4 focus-within:border-[#E23B2E] focus-within:ring-2 focus-within:ring-[#F0523F]/15">
          <Search size={20} className="text-[#B08981]" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-base text-[#1A1110] placeholder:text-[#B08981] focus:outline-none"
          />
        </label>
        <select value={filterWiki} onChange={e => setFilterWiki(e.target.value)}
          className="h-[52px] rounded-xl border border-[#EBD9D5] bg-white px-4 text-base font-medium text-[#1A1110] focus:border-[#E23B2E] focus:outline-none">
          <option value="">All wikis</option>
          {wikis.map(w => <option key={w.slug} value={w.slug}>{w.displayName}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="h-[52px] rounded-xl border border-[#EBD9D5] bg-white px-4 text-base font-medium text-[#1A1110] focus:border-[#E23B2E] focus:outline-none">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div className="space-y-4">
        {loading && <p className="rounded-[1.5rem] border border-[#F2E1DD] bg-white p-10 text-center text-lg text-[#8B6B65]">Loading…</p>}
        {error && <p className="rounded-[1.5rem] border border-[#F6C9C1] bg-[#FDEDEA] p-8 text-center text-lg font-medium text-[#E23B2E]">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-[1.5rem] border border-[#F2E1DD] bg-white p-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDEDEA] text-[#E23B2E]"><GraduationCap size={26} /></div>
            <p className="text-lg font-bold text-[#1A1110]">No teachers found</p>
            <p className="mt-1 text-base text-[#8B6B65]">Try a different search or add a teacher.</p>
          </div>
        )}
        {!loading && filtered.map(t => {
          const assigned = t.assignedWikiSlugs || []
          return (
            <section key={t.id} className="rounded-[1.5rem] border border-[#F2E1DD] bg-white px-6 py-6 shadow-[0_24px_50px_-42px_rgba(226,59,46,0.5)] transition-shadow hover:shadow-[0_28px_56px_-40px_rgba(226,59,46,0.55)]">
              <div className="grid items-center gap-6 lg:grid-cols-[300px_150px_92px_120px_170px_1fr]">
                <div className="flex items-center gap-4">
                  <DirectoryAvatar name={t.name} email={t.email} src={t.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold text-[#1A1110]">{t.name || 'Unnamed'}</p>
                    <p className="truncate text-base text-[#8B6B65]">{t.email}</p>
                  </div>
                </div>

                <div>
                  <FieldLabel>Assigned wikis</FieldLabel>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      setAssignedDialogTeacher(t)
                    }}
                    className="mt-2 inline-flex items-center rounded-xl border border-[#F2C9C1] bg-[#FDEDEA] px-3.5 py-1.5 text-[15px] font-bold text-[#E23B2E] hover:bg-[#FBDDD7]"
                  >
                    {assigned.length} assigned
                  </button>
                </div>

                <div>
                  <FieldLabel>Students</FieldLabel>
                  <p className="mt-2 text-xl font-bold text-[#1A1110]">{t.studentCount}</p>
                </div>

                <div>
                  <FieldLabel>Last login</FieldLabel>
                  <p className="mt-2 text-base text-[#6B4F4A]">{timeAgo(t.lastLoginAt)}</p>
                </div>

                <div>
                  <FieldLabel>Created by</FieldLabel>
                  {t.createdByName ? (
                    <div className="mt-2 leading-snug">
                      <p className="text-base font-bold text-[#1A1110]">{t.createdByName}</p>
                      <p className="truncate text-sm text-[#8B6B65]">{t.createdByEmail}</p>
                      <p className="text-sm text-[#B08981]">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <div className="mt-2 leading-snug">
                      <p className="text-base font-semibold text-[#6B4F4A]">—</p>
                      <p className="text-sm text-[#B08981]">Joined {new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-4">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${t.disabledAt ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                    <span className={`h-2 w-2 rounded-full ${t.disabledAt ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    {t.disabledAt ? 'Disabled' : 'Active'}
                  </span>
                  <button
                    onClick={() => toggleDisabled(t)}
                    className="rounded-xl border border-[#EBD9D5] bg-white px-4 py-2.5 text-[15px] font-semibold text-[#6B4F4A] transition hover:bg-[#FBF3F1]"
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
