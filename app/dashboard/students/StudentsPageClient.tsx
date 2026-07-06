"use client"

import type { ReactNode } from 'react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Search, X, CheckCircle2, Clock, Circle, BookOpen } from 'lucide-react'

type WikiProgress = {
  wikiSlug: string; teacherName: string | null; teacherEmail: string
  joinedAt: string; progress: { completed: number; in_progress: number; total: number }
}
type StudentSummary = {
  student: { id: string; email: string; name: string | null; createdAt: string }
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
  joinedAt: string; lessons: LessonDetail[]
  completed: number; inProgress: number; total: number
}
type StudentDetail = {
  student: { id: string; email: string; name: string | null; createdAt: string }
  sections: WikiSection[]
}

function pct(c: number, t: number) { return t > 0 ? Math.round(c / t * 100) : 0 }

function timeAgo(d: string | null) {
  if (!d) return null
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString()
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  const parts = source.split(/\s+/)
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}

function DirectoryAvatar({ name, email }: { name: string | null; email: string }) {
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#ECEEF2] to-[#D7DAE1] text-base font-bold text-[#8A8F99] shadow-inner">
      <div className="absolute top-4 h-5 w-5 rounded-full bg-[#9EA3AD]" />
      <div className="absolute bottom-2 h-7 w-11 rounded-t-full bg-[#9EA3AD]" />
      <span className="sr-only">{initials(name, email)}</span>
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-wide text-[#30323A]">{children}</p>
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const p = pct(completed, total)
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#ECEEF2]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#F0523F] to-[#E23B2E] transition-all" style={{ width: `${Math.max(p, 3)}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-lg font-semibold text-[#30323A]">{p}%</span>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 size={17} className="shrink-0 text-emerald-500" />
  if (status === 'in_progress') return <Clock size={17} className="shrink-0 text-blue-500" />
  return <Circle size={17} className="shrink-0 text-gray-300" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          {data ? (
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{data.student.name || 'Unnamed student'}</h2>
              <p className="text-base text-gray-500">{data.student.email}</p>
            </div>
          ) : <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />}
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {loading && <p className="py-8 text-center text-base text-gray-500">Loading...</p>}
          {data?.sections.length === 0 && <p className="py-8 text-center text-base text-gray-500">No active enrollments.</p>}
          {data?.sections.map(section => (
            <div key={section.wikiSlug} className="overflow-hidden rounded-lg border border-gray-200">
              <button className="flex w-full items-center justify-between bg-gray-50 px-4 py-3.5 transition-colors hover:bg-gray-100"
                onClick={() => setOpenWiki(openWiki === section.wikiSlug ? null : section.wikiSlug)}>
                <div className="flex min-w-0 items-center gap-3">
                  <BookOpen size={17} className="shrink-0 text-gray-400" />
                  <div className="min-w-0 text-left">
                    <p className="text-base font-semibold text-gray-900">{section.wikiName}</p>
                    <p className="text-base text-gray-500">Teacher: {section.teacher.name || section.teacher.email} - Joined {timeAgo(section.joinedAt)}</p>
                  </div>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-4">
                  <p className="text-base text-gray-700"><span className="font-semibold">{section.completed}</span><span className="text-gray-400">/{section.total}</span></p>
                  <div className="w-28"><ProgressBar completed={section.completed} total={section.total} /></div>
                  <ChevronRight size={17} className={`shrink-0 text-gray-400 transition-transform ${openWiki === section.wikiSlug ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {openWiki === section.wikiSlug && (
                <div>
                  {section.lessons.length === 0 && <p className="px-5 py-3 text-base text-gray-400">No published lessons.</p>}
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-100">
                      {section.lessons.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="w-6 px-5 py-2.5"><StatusIcon status={l.status} /></td>
                          <td className="py-2.5 pr-4">
                            <p className={`text-base ${l.status === 'not_started' ? 'text-gray-400' : 'text-gray-800'}`}>{l.order}. {l.title}</p>
                          </td>
                          <td className="py-2.5 pr-5 text-right whitespace-nowrap">
                            {l.status === 'completed' && <p className="text-base text-emerald-600">Done {timeAgo(l.completedAt)}</p>}
                            {l.status === 'in_progress' && <p className="text-base text-blue-500">Viewed {timeAgo(l.lastViewedAt)}</p>}
                            {l.status === 'not_started' && <p className="text-base text-gray-300">-</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between border-t border-gray-100 bg-gray-50 px-5 py-2.5 text-base text-gray-500">
                    <span>
                      <span className="font-medium text-emerald-600">{section.completed} done</span>
                      {section.inProgress > 0 && <span className="ml-3 font-medium text-blue-500">{section.inProgress} in progress</span>}
                    </span>
                    <span>{pct(section.completed, section.total)}% complete</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {data && (
          <div className="flex shrink-0 justify-between border-t border-gray-200 px-6 py-3 text-base text-gray-400">
            <span>Member since {new Date(data.student.createdAt).toLocaleDateString()}</span>
            <span>{data.sections.length} wiki{data.sections.length !== 1 ? 's' : ''} enrolled</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentsPageClient() {
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterWiki, setFilterWiki] = useState('')
  const [filterTeacher, setFilterTeacher] = useState('')
  const [filterProgress, setFilterProgress] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/students')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setStudents(data.students || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

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

  return (
    <div className="dashboard-list-scale mx-auto max-w-[1224px] space-y-6 text-[#070A12]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#D8DADF] pb-6">
        <div>
          <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-base font-medium text-[#6C7078] hover:text-[#070A12]">
            <ChevronLeft size={18} /> Back
          </Link>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-[-0.01em] text-[#070A12]">Student Directory</h1>
          <p className="mt-2 text-lg text-[#2F333B]">{students.length} total</p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-[#C9CCD3] bg-white px-5 py-3 text-lg font-semibold text-[#070A12] shadow-[0_3px_8px_rgba(15,23,42,0.16)] transition hover:bg-[#F8F9FB]"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_190px_224px_190px]">
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
          {allWikis.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
          className="h-[46px] rounded-lg border border-[#C6CAD2] bg-white px-4 text-lg text-[#111318] shadow-[0_2px_7px_rgba(15,23,42,0.08)] focus:outline-none">
          <option value="">All teachers</option>
          {allTeachers.map(([email, name]) => <option key={email} value={email}>{name}</option>)}
        </select>
        <select value={filterProgress} onChange={e => setFilterProgress(e.target.value)}
          className="h-[46px] rounded-lg border border-[#C6CAD2] bg-white px-4 text-lg text-[#111318] shadow-[0_2px_7px_rgba(15,23,42,0.08)] focus:outline-none">
          <option value="all">All progress</option>
          <option value="not_started">Not started</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {hasFilters && (
        <button onClick={() => { setSearch(''); setFilterWiki(''); setFilterTeacher(''); setFilterProgress('all') }}
          className="inline-flex items-center gap-2 text-base font-medium text-[#60656F] hover:text-[#070A12]">
          <X size={16} /> Clear filters
        </button>
      )}

      <div className="space-y-6">
        {loading && <p className="rounded-xl border border-[#D9DCE2] bg-white p-8 text-center text-lg text-[#60656F]">Loading...</p>}
        {error && <p className="rounded-xl border border-red-200 bg-white p-8 text-center text-lg text-red-600">{error}</p>}
        {!loading && filtered.length === 0 && <p className="rounded-xl border border-[#D9DCE2] bg-white p-8 text-center text-lg text-[#60656F]">No students found.</p>}
        {!loading && filtered.map(s => {
          const complete = pct(s.totalCompleted, s.totalLessons)
          const teacherNames = [...new Set(s.wikis.map(w => w.teacherName || w.teacherEmail))]
          return (
            <section key={s.student.id} className="rounded-xl border border-[#D0D3DA] bg-white px-5 py-6 shadow-[0_6px_18px_rgba(15,23,42,0.14)]">
              <div className="grid items-center gap-6 lg:grid-cols-[300px_150px_190px_170px_120px_112px]">
                <div className="flex items-center gap-4">
                  <DirectoryAvatar name={s.student.name} email={s.student.email} />
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold text-[#05070D]">{s.student.name || 'Unnamed'}</p>
                    <p className="truncate text-base text-[#3F434B]">{s.student.email}</p>
                  </div>
                </div>

                <div>
                  <FieldLabel>Enrolled Wikis</FieldLabel>
                  <p className="mt-2 text-lg font-semibold text-[#070A12]">{s.wikis.length} Assigned</p>
                </div>

                <div>
                  <FieldLabel>Progress</FieldLabel>
                  <div className="mt-3">
                    <ProgressBar completed={s.totalCompleted} total={s.totalLessons} />
                    <p className="mt-1 text-base text-[#60656F]">{s.totalCompleted} / {s.totalLessons} lessons</p>
                  </div>
                </div>

                <div>
                  <FieldLabel>Teachers</FieldLabel>
                  <p className="mt-2 truncate text-lg text-[#070A12]">{teacherNames.length ? teacherNames.join(', ') : '-'}</p>
                </div>

                <div>
                  <FieldLabel>Joined</FieldLabel>
                  <p className="mt-2 whitespace-nowrap text-lg text-[#070A12]">{new Date(s.student.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center justify-end gap-5">
                  <span className={`h-5 w-5 rounded-full ${complete === 100 ? 'bg-[#56BD68]' : complete > 0 ? 'bg-blue-400' : 'bg-gray-300'} shadow-[0_1px_5px_rgba(15,23,42,0.22)]`} />
                  <button
                    onClick={() => setSelectedId(s.student.id)}
                    className="rounded-lg border border-[#C9CCD3] bg-white px-5 py-2.5 text-lg font-medium text-[#070A12] shadow-sm transition hover:bg-[#F8F9FB]"
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
