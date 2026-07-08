"use client"

import type { ReactNode } from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Cairo } from 'next/font/google'
import { ChevronLeft, ChevronRight, Search, X, CheckCircle2, Clock, Circle, BookOpen, Users, RefreshCw, GraduationCap, TrendingUp } from 'lucide-react'
import { formatUtcDate } from '@/lib/format-date'
import PrettySelect from '@/components/ui/PrettySelect'

const display = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-cairo' })

type WikiProgress = {
  wikiSlug: string; teacherName: string | null; teacherEmail: string
  joinedAt: string; status?: string; progress: { completed: number; in_progress: number; total: number }
}
type StudentSummary = {
  student: { id: string; email: string; name: string | null; avatarUrl: string | null; createdAt: string }
  wikis: WikiProgress[]; totalCompleted: number; totalLessons: number
}
type LessonDetail = {
  id: string; title: string; order: number; duration_min: number
  status: 'completed' | 'in_progress' | 'not_started'
  completedAt: string | null; lastViewedAt: string | null
}
type WikiSection = {
  wikiSlug: string; wikiName: string
  teacher: { name: string | null; email: string }
  joinedAt: string; status?: string; removedAt?: string | null
  lessons: LessonDetail[]
  completed: number; inProgress: number; total: number
}
type StudentDetail = {
  student: { id: string; email: string; name: string | null; avatarUrl: string | null; createdAt: string }
  sections: WikiSection[]
}

function pct(c: number, t: number) { return t > 0 ? Math.round(c / t * 100) : 0 }

// Deterministic date shared with the server render (see lib/format-date).
function formatDate(d: string | Date | null | undefined) {
  return formatUtcDate(d)
}

function timeAgo(d: string | null) {
  if (!d) return null
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return formatDate(d)
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

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const p = pct(completed, total)
  const done = p === 100
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EEF1F5]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#F0523F] to-[#E23B2E]'}`}
          style={{ width: `${Math.max(p, p > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className={`w-11 shrink-0 text-right text-base font-bold ${done ? 'text-emerald-600' : 'text-[#334155]'}`}>{p}%</span>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 size={17} className="shrink-0 text-emerald-500" />
  if (status === 'in_progress') return <Clock size={17} className="shrink-0 text-amber-500" />
  return <Circle size={17} className="shrink-0 text-[#CBD5E1]" />
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

function StudentModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [data, setData] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [openWiki, setOpenWiki] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/students/${studentId}`).then(r => r.json()).then(d => {
      setData(d)
      if (d.sections?.length) setOpenWiki(d.sections[0].wikiSlug)
    }).finally(() => setLoading(false))
  }, [studentId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#E7E9EE] bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.5)]" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#EEF0F4] px-6 py-5">
          {data ? (
            <div className="flex min-w-0 items-center gap-3">
              <DirectoryAvatar name={data.student.name} email={data.student.email} src={data.student.avatarUrl} />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-[#0F172A]">{data.student.name || 'Unnamed student'}</h2>
                <p className="truncate text-base text-[#64748B]">{data.student.email}</p>
              </div>
            </div>
          ) : <div className="h-10 w-56 animate-pulse rounded-xl bg-[#F1F3F7]" />}
          <button onClick={onClose} className="rounded-xl p-2 text-[#94A3B8] transition-colors hover:bg-[#F1F3F7] hover:text-[#0F172A]" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-[#FAFBFC] px-6 py-5">
          {loading && <p className="py-8 text-center text-base text-[#64748B]">Loading…</p>}
          {data?.sections.length === 0 && <p className="rounded-2xl border border-dashed border-[#E2E6EC] bg-white py-10 text-center text-base text-[#64748B]">No enrollments yet.</p>}
          {data?.sections.map(section => (
            <div key={section.wikiSlug} className="overflow-hidden rounded-2xl border border-[#E7E9EE] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <button className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-[#FAFBFC]"
                onClick={() => setOpenWiki(openWiki === section.wikiSlug ? null : section.wikiSlug)}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDECE9] text-[#E23B2E]"><BookOpen size={18} /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-bold text-[#0F172A]">{section.wikiName}</p>
                      {section.status && section.status !== 'active' && (
                        <span className="shrink-0 rounded-full bg-[#F1F3F7] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
                          {section.status === 'revoked' ? 'Link disabled' : 'Removed'}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-[#64748B]">{section.teacher.name || section.teacher.email} · Joined {timeAgo(section.joinedAt)}</p>
                  </div>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-4">
                  <p className="text-base text-[#334155]"><span className="font-bold">{section.completed}</span><span className="text-[#94A3B8]">/{section.total}</span></p>
                  <div className="hidden w-28 sm:block"><ProgressBar completed={section.completed} total={section.total} /></div>
                  <ChevronRight size={18} className={`shrink-0 text-[#94A3B8] transition-transform ${openWiki === section.wikiSlug ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {openWiki === section.wikiSlug && (
                <div className="border-t border-[#EEF0F4]">
                  {section.lessons.length === 0 && <p className="px-5 py-4 text-sm text-[#94A3B8]">No published lessons.</p>}
                  <table className="w-full">
                    <tbody className="divide-y divide-[#F1F3F7]">
                      {section.lessons.map(l => (
                        <tr key={l.id} className="transition-colors hover:bg-[#FAFBFC]">
                          <td className="w-6 px-5 py-3"><StatusIcon status={l.status} /></td>
                          <td className="py-3 pr-4">
                            <p className={`text-sm ${l.status === 'not_started' ? 'text-[#94A3B8]' : 'text-[#334155]'}`}>{l.order}. {l.title}</p>
                          </td>
                          <td className="py-3 pr-5 text-right whitespace-nowrap">
                            {l.status === 'completed' && <p className="text-sm font-medium text-emerald-600">Done {timeAgo(l.completedAt)}</p>}
                            {l.status === 'in_progress' && <p className="text-sm font-medium text-amber-600">Viewed {timeAgo(l.lastViewedAt)}</p>}
                            {l.status === 'not_started' && <p className="text-sm text-[#CBD5E1]">—</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between border-t border-[#EEF0F4] bg-[#FAFBFC] px-5 py-3 text-sm text-[#64748B]">
                    <span>
                      <span className="font-semibold text-emerald-600">{section.completed} done</span>
                      {section.inProgress > 0 && <span className="ml-3 font-semibold text-amber-600">{section.inProgress} in progress</span>}
                    </span>
                    <span className="font-semibold text-[#334155]">{pct(section.completed, section.total)}% complete</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {data && (
          <div className="flex shrink-0 justify-between border-t border-[#EEF0F4] px-6 py-4 text-sm text-[#94A3B8]">
            <span>Member since {formatDate(data.student.createdAt)}</span>
            <span>{data.sections.length} wiki{data.sections.length !== 1 ? 's' : ''} enrolled</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentsPageClient({ initialStudents = null }: { initialStudents?: StudentSummary[] | null }) {
  const [students, setStudents] = useState<StudentSummary[]>(initialStudents ?? [])
  // If the server pre-loaded data we render immediately; otherwise we'll fetch
  // on mount, so start in the loading state as before.
  const [loading, setLoading] = useState(initialStudents == null)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterWiki, setFilterWiki] = useState('')
  const [filterTeacher, setFilterTeacher] = useState('')
  const [filterProgress, setFilterProgress] = useState('all')
  const [includeFormer, setIncludeFormer] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/students${includeFormer ? '?includeFormer=1' : ''}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setStudents(data.students || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [includeFormer])

  // Fetch whenever the includeFormer toggle changes, but skip the very first
  // render if the server already provided that exact view. Tracking the last
  // toggle we loaded (seeded to the server's `false` view) makes this correct
  // and idempotent under React StrictMode's double-invoked mount effects.
  const lastLoadedFormer = useRef<boolean | null>(initialStudents != null ? false : null)
  useEffect(() => {
    if (lastLoadedFormer.current === includeFormer) return
    lastLoadedFormer.current = includeFormer
    load()
  }, [load, includeFormer])

  const allWikis = [...new Set(students.flatMap(s => s.wikis.map(w => w.wikiSlug)))]
  const allTeachers = [...new Map(students.flatMap(s => s.wikis.map(w => [w.teacherEmail, w.teacherName || w.teacherEmail]))).entries()]

  const filtered = students.filter(s => {
    if (search && !s.student.name?.toLowerCase().includes(search.toLowerCase()) && !s.student.email.toLowerCase().includes(search.toLowerCase())) return false
    if (filterWiki && !s.wikis.some(w => w.wikiSlug === filterWiki)) return false
    if (filterTeacher && !s.wikis.some(w => w.teacherEmail === filterTeacher)) return false
    if (filterProgress !== 'all') {
      const p = pct(s.totalCompleted, s.totalLessons)
      if (filterProgress === 'not_started' && p > 0) return false
      if (filterProgress === 'in_progress' && (p === 0 || p === 100)) return false
      if (filterProgress === 'completed' && p < 100) return false
    }
    return true
  })

  const hasFilters = search || filterWiki || filterTeacher || filterProgress !== 'all'

  const avgCompletion = students.length
    ? Math.round(students.reduce((sum, s) => sum + pct(s.totalCompleted, s.totalLessons), 0) / students.length)
    : 0
  const fullyComplete = students.filter(s => s.totalLessons > 0 && s.totalCompleted >= s.totalLessons).length

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
              <Users size={22} />
            </div>
            <h1 className="text-[28px] font-extrabold leading-none tracking-tight text-[#0F172A]">Student directory</h1>
          </div>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E2E6EC] bg-white px-4 py-2.5 text-base font-semibold text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#CBD5E1] hover:bg-[#FAFBFC]"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard icon={<Users size={20} />} label="Total students" value={String(students.length)} tint="bg-[#FDECE9] text-[#E23B2E]" />
        <MetricCard icon={<TrendingUp size={20} />} label="Average completion" value={`${avgCompletion}%`} tint="bg-[#EAF1FE] text-[#2F6BE0]" />
        <MetricCard icon={<GraduationCap size={20} />} label="Fully complete" value={String(fullyComplete)} tint="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_190px_224px_190px]">
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
          options={[{ value: '', label: 'All wikis' }, ...allWikis.map(w => ({ value: w, label: w }))]}
        />
        <PrettySelect
          value={filterTeacher}
          onValueChange={setFilterTeacher}
          ariaLabel="Filter by teacher"
          options={[{ value: '', label: 'All teachers' }, ...allTeachers.map(([email, name]) => ({ value: email, label: name }))]}
        />
        <PrettySelect
          value={filterProgress}
          onValueChange={setFilterProgress}
          ariaLabel="Filter by progress"
          options={[
            { value: 'all', label: 'All progress' },
            { value: 'not_started', label: 'Not started' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#64748B] transition-colors hover:text-[#0F172A]">
          <input
            type="checkbox"
            checked={includeFormer}
            onChange={e => setIncludeFormer(e.target.checked)}
            className="h-4 w-4 rounded border-[#CBD5E1] accent-[#E23B2E]"
          />
          Include former students (disabled links / removed)
        </label>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterWiki(''); setFilterTeacher(''); setFilterProgress('all') }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64748B] transition-colors hover:text-[#E23B2E]">
            <X size={15} /> Clear filters
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading && <p className="rounded-2xl border border-[#EAECF1] bg-white p-10 text-center text-base text-[#64748B]">Loading…</p>}
        {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-base font-medium text-red-600">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#D8DEE6] bg-white p-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F3F7] text-[#94A3B8]"><Users size={26} /></div>
            <p className="text-lg font-bold text-[#0F172A]">No students found</p>
            <p className="mt-1 text-base text-[#64748B]">{hasFilters ? 'Try adjusting your filters.' : 'Students appear here once they join a class.'}</p>
          </div>
        )}
        {!loading && filtered.map(s => {
          const complete = pct(s.totalCompleted, s.totalLessons)
          const teacherNames = [...new Set(s.wikis.map(w => w.teacherName || w.teacherEmail))]
          const dot = complete === 100 ? 'bg-emerald-500' : complete > 0 ? 'bg-amber-400' : 'bg-[#CBD5E1]'
          return (
            <section key={s.student.id} className="group rounded-2xl border border-[#EAECF1] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#F3D3CD] hover:shadow-[0_18px_40px_-24px_rgba(226,59,46,0.4)]">
              <div className="grid items-center gap-6 lg:grid-cols-[300px_150px_190px_170px_120px_112px]">
                <div className="flex items-center gap-4">
                  <DirectoryAvatar name={s.student.name} email={s.student.email} src={s.student.avatarUrl} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-lg font-bold text-[#0F172A]">{s.student.name || 'Unnamed'}</p>
                      {s.wikis.length > 0 && s.wikis.every(w => w.status && w.status !== 'active') && (
                        <span className="shrink-0 rounded-full bg-[#F1F3F7] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Former</span>
                      )}
                    </div>
                    <p className="truncate text-sm text-[#64748B]">{s.student.email}</p>
                  </div>
                </div>

                <div>
                  <FieldLabel>Enrolled wikis</FieldLabel>
                  <p className="mt-2 text-base font-bold text-[#0F172A]">{s.wikis.length} assigned</p>
                </div>

                <div>
                  <FieldLabel>Progress</FieldLabel>
                  <div className="mt-2.5">
                    <ProgressBar completed={s.totalCompleted} total={s.totalLessons} />
                    <p className="mt-1.5 text-sm text-[#94A3B8]">{s.totalCompleted} / {s.totalLessons} lessons</p>
                  </div>
                </div>

                <div>
                  <FieldLabel>Teachers</FieldLabel>
                  <p className="mt-2 truncate text-base text-[#334155]">{teacherNames.length ? teacherNames.join(', ') : '—'}</p>
                </div>

                <div>
                  <FieldLabel>Joined</FieldLabel>
                  <p className="mt-2 whitespace-nowrap text-base text-[#334155]">{formatDate(s.student.createdAt)}</p>
                </div>

                <div className="flex items-center justify-end gap-4">
                  <span className={`h-3 w-3 rounded-full ${dot} ring-4 ring-black/[0.03]`} title={`${complete}% complete`} />
                  <button
                    onClick={() => setSelectedId(s.student.id)}
                    className="rounded-xl border border-[#E2E6EC] bg-white px-4 py-2 text-base font-semibold text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#F3D3CD] hover:bg-[#FDF3F1] hover:text-[#E23B2E]"
                  >
                    Details
                  </button>
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {selectedId && <StudentModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
