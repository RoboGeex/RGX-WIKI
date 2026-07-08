"use client"

import type { FormEvent, ReactNode } from 'react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Cairo } from 'next/font/google'
import { Check, ChevronLeft, Plus, X, Search, Users, GraduationCap, RefreshCw, UserCheck } from 'lucide-react'
import { formatUtcDate } from '@/lib/format-date'
import PrettySelect from '@/components/ui/PrettySelect'

const display = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-cairo' })

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
  return days < 30 ? `${days}d ago` : formatUtcDate(d)
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  const parts = source.split(/\s+/)
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function DirectoryAvatar({ name, email, src }: { name: string | null; email: string; src?: string | null }) {
  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] text-base font-bold text-white shadow-[0_6px_16px_-6px_rgba(226,59,46,0.6)] ring-1 ring-black/5">
      {src ? (
        <Image src={src} alt={name || email} fill sizes="56px" className="object-cover" />
      ) : (
        <span>{initials(name, email)}</span>
      )}
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]">{children}</p>
}

function MetricCard({ icon, label, value, tint }: { icon: ReactNode; label: string; value: string; tint: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[#EAECF1] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#8A93A3]">{label}</p>
        <p className="text-2xl font-extrabold leading-tight tracking-tight text-[#0F172A]">{value}</p>
      </div>
    </div>
  )
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
    <div className={`${display.variable} rgx-dash fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-4 backdrop-blur-sm`} onClick={onClose}>
      <form onSubmit={handleSubmit} className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#E7E9EE] bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.5)]" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-[#EEF0F4] px-6 py-5">
          <h2 className="text-xl font-bold text-[#0F172A]">Add teacher</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-[#94A3B8] transition-colors hover:bg-[#F1F3F7] hover:text-[#0F172A]" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Full name</span>
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full rounded-xl border border-[#E2E6EC] px-3.5 py-2.5 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10" />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Email</span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E2E6EC] px-3.5 py-2.5 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-[#475569]">Password <span className="font-medium text-[#94A3B8]">(min 8 characters)</span></span>
            <input type="text" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E2E6EC] px-3.5 py-2.5 text-base text-[#0F172A] outline-none transition focus:border-[#E23B2E] focus:ring-4 focus:ring-[#E23B2E]/10" />
          </label>
          <div>
            <p className="mb-2.5 text-sm font-semibold text-[#475569]">Assign wikis</p>
            <div className="flex flex-wrap gap-2">
              {wikis.map(w => (
                <button key={w.slug} type="button" onClick={() => toggle(w.slug)}
                  className={`rounded-xl border px-3.5 py-2 text-base font-medium transition-colors ${selectedWikis.includes(w.slug) ? 'border-[#E23B2E] bg-[#FDECE9] text-[#E23B2E]' : 'border-[#E2E6EC] bg-white text-[#475569] hover:border-[#CBD5E1]'}`}>
                  {w.displayName}
                </button>
              ))}
              {wikis.length === 0 && <p className="text-base text-[#94A3B8]">No published wikis yet.</p>}
            </div>
          </div>
          {error && <p className="text-base font-medium text-red-600">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end gap-2.5 border-t border-[#EEF0F4] bg-[#FAFBFC] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#E2E6EC] bg-white px-4 py-2.5 text-base font-semibold text-[#475569] transition hover:bg-[#F1F3F7]">Cancel</button>
          <button type="submit" disabled={creating} className="rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] px-5 py-2.5 text-base font-bold text-white shadow-[0_8px_20px_-8px_rgba(226,59,46,0.7)] transition hover:-translate-y-0.5 disabled:opacity-50">
            {creating ? 'Creating…' : 'Create teacher'}
          </button>
        </div>
      </form>
    </div>
  )
}

function WikiEditor({ teacher, wikis, onSave, onCancel }: { teacher: Teacher; wikis: Wiki[]; onSave: (slugs: string[]) => void; onCancel: () => void }) {
  const [sel, setSel] = useState(teacher.assignedWikiSlugs || [])
  const toggle = (slug: string) => setSel(p => p.includes(slug) ? p.filter(s => s !== slug) : [...p, slug])
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-[#475569]">Choose assigned wikis</p>
      <div className="grid gap-2">
        {wikis.map(w => (
          <button key={w.slug} type="button" onClick={() => toggle(w.slug)}
            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-base font-medium transition-colors ${sel.includes(w.slug) ? 'border-[#E23B2E] bg-[#FDECE9] text-[#E23B2E]' : 'border-[#E2E6EC] bg-white text-[#475569] hover:border-[#CBD5E1] hover:bg-[#FAFBFC]'}`}>
            <span className="truncate">{w.displayName}</span>
            <span className={`ml-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${sel.includes(w.slug) ? 'border-[#E23B2E] bg-[#E23B2E] text-white' : 'border-[#CBD5E1] text-transparent'}`}>
              <Check size={12} />
            </span>
          </button>
        ))}
        {wikis.length === 0 && (
          <p className="rounded-xl border border-dashed border-[#E2E6EC] bg-[#FAFBFC] px-3 py-5 text-center text-base text-[#64748B]">
            No published wikis yet.
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2.5 pt-1">
        <button onClick={onCancel} className="rounded-xl border border-[#E2E6EC] bg-white px-4 py-2.5 text-base font-semibold text-[#475569] transition hover:bg-[#F1F3F7]">Cancel</button>
        <button onClick={() => onSave(sel)} className="rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] px-5 py-2.5 text-base font-bold text-white shadow-[0_8px_20px_-8px_rgba(226,59,46,0.7)] transition hover:-translate-y-0.5">Save changes</button>
      </div>
    </div>
  )
}

function AssignedWikisDialog({
  teacher, wikis, editing, onEdit, onSave, onClose,
}: {
  teacher: Teacher; wikis: Wiki[]; editing: boolean
  onEdit: () => void; onSave: (slugs: string[]) => void; onClose: () => void
}) {
  const assigned = teacher.assignedWikiSlugs || []
  const assignedWikis = assigned.map(slug => wikis.find(w => w.slug === slug)?.displayName || slug)

  return (
    <div className={`${display.variable} rgx-dash fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-4 backdrop-blur-sm`} onClick={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-[460px] flex-col overflow-hidden rounded-3xl border border-[#E7E9EE] bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.5)]" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#EEF0F4] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <DirectoryAvatar name={teacher.name} email={teacher.email} src={teacher.avatarUrl} />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-[#0F172A]">Assigned wikis</h2>
              <p className="truncate text-base text-[#64748B]">{teacher.name || teacher.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-[#94A3B8] transition-colors hover:bg-[#F1F3F7] hover:text-[#0F172A]" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#FAFBFC] px-6 py-5">
          {editing ? (
            <WikiEditor teacher={teacher} wikis={wikis} onSave={onSave} onCancel={onClose} />
          ) : assignedWikis.length > 0 ? (
            <div className="space-y-2">
              <div className="mb-3 inline-flex rounded-full bg-[#FDECE9] px-3 py-1 text-sm font-bold text-[#E23B2E]">{assignedWikis.length} assigned</div>
              {assignedWikis.map(name => (
                <div key={name} className="flex items-center gap-3 rounded-xl border border-[#E7E9EE] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="min-w-0 truncate text-base font-medium text-[#0F172A]">{name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[#E2E6EC] bg-white px-4 py-10 text-center text-base text-[#64748B]">No wikis assigned.</p>
          )}
        </div>

        {!editing && (
          <div className="flex shrink-0 justify-end gap-2.5 border-t border-[#EEF0F4] px-6 py-4">
            <button onClick={onClose} className="rounded-xl border border-[#E2E6EC] bg-white px-4 py-2.5 text-base font-semibold text-[#475569] transition hover:bg-[#F1F3F7]">Close</button>
            <button onClick={onEdit} className="rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] px-5 py-2.5 text-base font-bold text-white shadow-[0_8px_20px_-8px_rgba(226,59,46,0.7)] transition hover:-translate-y-0.5">Edit assignment</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TeachersPageClient({ wikis, initialTeachers = null }: { wikis: Wiki[]; initialTeachers?: Teacher[] | null }) {
  const searchParams = useSearchParams()
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers ?? [])
  // If the server pre-loaded data we render immediately; otherwise fetch on
  // mount, so start in the loading state as before.
  const [loading, setLoading] = useState(initialTeachers == null)
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

  // Fetch on mount only when the server did NOT pre-load data. This pure guard
  // (no "run once" ref) is idempotent under React StrictMode's double-invoked
  // mount effects — it never re-fetches over server data. Refresh calls load()
  // directly, so it's unaffected.
  useEffect(() => {
    if (initialTeachers != null) return
    load()
    // initialTeachers is mount-stable (from a server component); only load changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  useEffect(() => {
    if (searchParams?.get('invite') === '1') setShowDialog(true)
  }, [searchParams])

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

  const filtered = teachers.filter(t => {
    if (search && !t.name?.toLowerCase().includes(search.toLowerCase()) && !t.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filterWiki && !(t.assignedWikiSlugs || []).includes(filterWiki)) return false
    if (filterStatus === 'active' && t.disabledAt) return false
    if (filterStatus === 'disabled' && !t.disabledAt) return false
    return true
  })

  const hasFilters = search || filterWiki || filterStatus !== 'all'
  const activeCount = teachers.filter(t => !t.disabledAt).length
  const totalStudents = teachers.reduce((sum, t) => sum + (t.studentCount || 0), 0)

  return (
    <div className={`${display.variable} rgx-dash mx-auto max-w-[1224px] space-y-6 text-[#0F172A]`}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#64748B] transition-colors hover:text-[#0F172A]">
            <ChevronLeft size={16} /> Back to dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] text-white shadow-[0_8px_20px_-8px_rgba(226,59,46,0.7)]">
              <GraduationCap size={22} />
            </div>
            <h1 className="text-[28px] font-extrabold leading-none tracking-tight text-[#0F172A]">Teacher directory</h1>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2E6EC] bg-white px-4 py-2.5 text-base font-semibold text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#CBD5E1] hover:bg-[#FAFBFC]"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setShowDialog(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] px-5 py-2.5 text-base font-bold text-white shadow-[0_8px_20px_-8px_rgba(226,59,46,0.7)] transition hover:-translate-y-0.5"
          >
            <Plus size={18} /> Add teacher
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon={<GraduationCap size={20} />} label="Total teachers" value={String(teachers.length)} tint="bg-[#FDECE9] text-[#E23B2E]" />
        <MetricCard icon={<UserCheck size={20} />} label="Active" value={String(activeCount)} tint="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={<Users size={20} />} label="Total students" value={String(totalStudents)} tint="bg-[#EAF1FE] text-[#2F6BE0]" />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_224px_224px]">
        <label className="flex h-[46px] items-center gap-3 rounded-xl border border-[#E2E6EC] bg-white px-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition focus-within:border-[#E23B2E] focus-within:ring-4 focus-within:ring-[#E23B2E]/10">
          <Search size={19} className="text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-base text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
          />
        </label>
        <PrettySelect
          value={filterWiki}
          onValueChange={setFilterWiki}
          ariaLabel="Filter by wiki"
          options={[{ value: '', label: 'All wikis' }, ...wikis.map(w => ({ value: w.slug, label: w.displayName }))]}
        />
        <PrettySelect
          value={filterStatus}
          onValueChange={(value) => setFilterStatus(value as typeof filterStatus)}
          ariaLabel="Filter by status"
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'disabled', label: 'Disabled' },
          ]}
        />
      </div>

      {hasFilters && (
        <button onClick={() => { setSearch(''); setFilterWiki(''); setFilterStatus('all') }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64748B] transition-colors hover:text-[#E23B2E]">
          <X size={15} /> Clear filters
        </button>
      )}

      {/* List */}
      <div className="space-y-4">
        {loading && <p className="rounded-2xl border border-[#EAECF1] bg-white p-10 text-center text-base text-[#64748B]">Loading…</p>}
        {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-base font-medium text-red-600">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#D8DEE6] bg-white p-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-[#94A3B8]"><GraduationCap size={26} /></div>
            <p className="text-lg font-bold text-[#0F172A]">No teachers found</p>
            <p className="mt-1 text-base text-[#64748B]">{hasFilters ? 'Try adjusting your filters.' : 'Add a teacher to get started.'}</p>
          </div>
        )}
        {!loading && filtered.map(t => {
          const assigned = t.assignedWikiSlugs || []
          const dot = t.disabledAt ? 'bg-[#CBD5E1]' : 'bg-emerald-500'
          return (
            <section key={t.id} className="group rounded-2xl border border-[#EAECF1] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#F3D3CD] hover:shadow-[0_18px_40px_-24px_rgba(226,59,46,0.4)]">
              <div className="grid items-center gap-6 lg:grid-cols-[300px_150px_110px_160px_1fr_150px]">
                <div className="flex items-center gap-4">
                  <DirectoryAvatar name={t.name} email={t.email} src={t.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-[#0F172A]">{t.name || 'Unnamed'}</p>
                    <p className="truncate text-sm text-[#64748B]">{t.email}</p>
                  </div>
                </div>

                <div>
                  <FieldLabel>Assigned wikis</FieldLabel>
                  <button
                    onClick={() => { setEditingId(null); setAssignedDialogTeacher(t) }}
                    className="mt-2 inline-flex w-fit items-center whitespace-nowrap rounded-lg border border-[#F3D3CD] bg-[#FDF3F1] px-3 py-1 text-sm font-bold text-[#E23B2E] transition hover:bg-[#FCE9E5]"
                  >
                    {assigned.length} assigned
                  </button>
                </div>

                <div>
                  <FieldLabel>Students</FieldLabel>
                  <p className="mt-2 text-lg font-bold text-[#0F172A]">{t.studentCount}</p>
                </div>

                <div>
                  <FieldLabel>Last login</FieldLabel>
                  {/* Relative time depends on the current clock, which differs
                      slightly between server render and client hydration —
                      suppress the (harmless) text mismatch. */}
                  <p className="mt-2 text-base text-[#334155]" suppressHydrationWarning>{timeAgo(t.lastLoginAt)}</p>
                </div>

                <div className="min-w-0">
                  <FieldLabel>Created by</FieldLabel>
                  {t.createdByName ? (
                    <div className="mt-2 leading-snug">
                      <p className="truncate text-base font-semibold text-[#0F172A]">{t.createdByName}</p>
                      <p className="truncate text-sm text-[#64748B]">{formatUtcDate(t.createdAt)}</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-base text-[#334155]">Joined {formatUtcDate(t.createdAt)}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-4">
                  <span className={`h-3 w-3 rounded-full ${dot} ring-4 ring-black/[0.03]`} title={t.disabledAt ? 'Disabled' : 'Active'} />
                  <Link
                    href={`/dashboard/teachers/${t.id}`}
                    className="rounded-xl border border-[#E2E6EC] bg-white px-4 py-2 text-base font-semibold text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#F3D3CD] hover:bg-[#FDF3F1] hover:text-[#E23B2E]"
                  >
                    Profile
                  </Link>
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
          onClose={() => { setEditingId(null); setAssignedDialogTeacher(null) }}
        />
      )}
    </div>
  )
}
