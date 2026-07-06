"use client"

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

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const p = pct(completed, total)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all" style={{ width: `${p}%` }} />
      </div>
      <span className="text-sm text-gray-500 w-10 text-right shrink-0">{p}%</span>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
  if (status === 'in_progress') return <Clock size={15} className="text-blue-500 shrink-0" />
  return <Circle size={15} className="text-gray-300 shrink-0" />
}

function timeAgo(d: string | null) {
  if (!d) return null
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString()
}

// ── Student detail modal ─────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          {data
            ? <div>
                <h2 className="text-base font-semibold text-gray-900">{data.student.name || 'Unnamed'}</h2>
                <p className="text-sm text-gray-500">{data.student.email}</p>
              </div>
            : <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />}
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {loading && <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>}
          {data?.sections.length === 0 && <p className="text-sm text-gray-500 py-8 text-center">No active enrollments.</p>}
          {data?.sections.map(section => (
            <div key={section.wikiSlug} className="border border-gray-200 rounded-lg overflow-hidden">
              <button className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setOpenWiki(openWiki === section.wikiSlug ? null : section.wikiSlug)}>
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen size={15} className="text-gray-400 shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{section.wikiName}</p>
                    <p className="text-sm text-gray-500">Teacher: {section.teacher.name || section.teacher.email} · Joined {timeAgo(section.joinedAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{section.completed}</span>
                    <span className="text-gray-400">/{section.total}</span>
                    <span className="text-gray-400 ml-1">lessons</span>
                  </p>
                  <div className="w-24"><ProgressBar completed={section.completed} total={section.total} /></div>
                  <ChevronRight size={15} className={`text-gray-400 transition-transform shrink-0 ${openWiki === section.wikiSlug ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {openWiki === section.wikiSlug && (
                <div>
                  {section.lessons.length === 0 && <p className="px-5 py-3 text-sm text-gray-400">No published lessons.</p>}
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-100">
                      {section.lessons.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-5 py-2.5 w-6"><StatusIcon status={l.status} /></td>
                          <td className="py-2.5 pr-4">
                            <p className={`text-sm ${l.status === 'not_started' ? 'text-gray-400' : 'text-gray-800'}`}>
                              {l.order}. {l.title}
                            </p>
                          </td>
                          <td className="py-2.5 pr-5 text-right whitespace-nowrap">
                            {l.status === 'completed' && <p className="text-sm text-emerald-600">Done {timeAgo(l.completedAt)}</p>}
                            {l.status === 'in_progress' && <p className="text-sm text-blue-500">Viewed {timeAgo(l.lastViewedAt)}</p>}
                            {l.status === 'not_started' && <p className="text-sm text-gray-300">—</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-between text-sm text-gray-500">
                    <span>
                      <span className="text-emerald-600 font-medium">{section.completed} done</span>
                      {section.inProgress > 0 && <span className="text-blue-500 font-medium ml-3">{section.inProgress} in progress</span>}
                    </span>
                    <span>{pct(section.completed, section.total)}% complete</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {data && (
          <div className="px-6 py-3 border-t border-gray-200 flex justify-between text-sm text-gray-400 shrink-0">
            <span>Member since {new Date(data.student.createdAt).toLocaleDateString()}</span>
            <span>{data.sections.length} wiki{data.sections.length !== 1 ? 's' : ''} enrolled</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
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
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/admin/students')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setStudents(data.students || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
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
    <div className="dashboard-list-scale space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeft size={16} /> Back
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">Students</h1>
          {!loading && <span className="text-sm text-gray-400 font-normal">{students.length} total</span>}
        </div>
        <button onClick={load} className="text-sm text-gray-400 hover:text-gray-700">↻ Refresh</button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
            className="text-sm focus:outline-none text-gray-700 placeholder-gray-400 w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={filterWiki} onChange={e => setFilterWiki(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:border-gray-500 bg-white">
            <option value="">All wikis</option>
            {allWikis.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:border-gray-500 bg-white">
            <option value="">All teachers</option>
            {allTeachers.map(([email, name]) => <option key={email} value={email}>{name}</option>)}
          </select>
          <select value={filterProgress} onChange={e => setFilterProgress(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 focus:outline-none focus:border-gray-500 bg-white">
            <option value="all">All progress</option>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setFilterWiki(''); setFilterTeacher(''); setFilterProgress('all') }}
              className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1">
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading && <p className="p-8 text-sm text-gray-500 text-center">Loading…</p>}
        {error && <p className="p-8 text-sm text-red-600 text-center">{error}</p>}
        {!loading && filtered.length === 0 && <p className="p-8 text-sm text-gray-400 text-center">No students found.</p>}
        {!loading && filtered.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Enrolled wikis</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Member since</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s, i) => (
                <tr key={s.student.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedId(s.student.id)}>
                  <td className="px-5 py-4 text-sm text-gray-400">{i + 1}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-900">{s.student.name || '—'}</p>
                    <p className="text-sm text-gray-500">{s.student.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {s.wikis.map(w => (
                        <span key={w.wikiSlug} className="px-2 py-0.5 rounded text-sm bg-gray-100 text-gray-700 border border-gray-200">{w.wikiSlug}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 w-52">
                    <ProgressBar completed={s.totalCompleted} total={s.totalLessons} />
                    <p className="text-sm text-gray-400 mt-1">{s.totalCompleted} / {s.totalLessons} lessons</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{new Date(s.student.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-500 flex items-center gap-0.5 hover:text-gray-900">
                      Details <ChevronRight size={14} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedId && <StudentModal studentId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
