"use client"

import { useEffect, useState, useCallback } from 'react'
import { X, CheckCircle2, Clock, Circle, BookOpen, ChevronRight } from 'lucide-react'

type WikiProgress = {
  wikiSlug: string
  teacherName: string | null
  teacherEmail: string
  joinedAt: string
  progress: { completed: number; in_progress: number; total: number }
}

type StudentSummary = {
  student: { id: string; email: string; name: string | null; createdAt: string }
  wikis: WikiProgress[]
  totalCompleted: number
  totalLessons: number
}

type LessonDetail = {
  id: string
  title: string
  order: number
  duration_min: number
  status: 'completed' | 'in_progress' | 'not_started'
  completedAt: string | null
  lastViewedAt: string | null
}

type WikiSection = {
  wikiSlug: string
  wikiName: string
  teacher: { name: string | null; email: string }
  joinedAt: string
  lessons: LessonDetail[]
  completed: number
  inProgress: number
  total: number
}

type StudentDetail = {
  student: { id: string; email: string; name: string | null; createdAt: string }
  sections: WikiSection[]
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
  if (status === 'in_progress') return <Clock size={15} className="text-blue-500 shrink-0" />
  return <Circle size={15} className="text-gray-300 shrink-0" />
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function StudentModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [data, setData] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openWiki, setOpenWiki] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/students/${studentId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [studentId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            {data ? (
              <>
                <h2 className="text-lg font-bold text-gray-900">{data.student.name || 'Unnamed student'}</h2>
                <p className="text-sm text-gray-400">{data.student.email}</p>
              </>
            ) : (
              <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {loading && <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>}
          {error && <p className="text-sm text-red-500 py-4">{error}</p>}

          {data && data.sections.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">No active enrollments.</p>
          )}

          {data?.sections.map(section => (
            <div key={section.wikiSlug} className="border border-gray-100 rounded-xl overflow-hidden">
              {/* Wiki header — clickable to expand */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setOpenWiki(openWiki === section.wikiSlug ? null : section.wikiSlug)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen size={15} className="text-gray-400 shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{section.wikiName}</p>
                    <p className="text-xs text-gray-400">
                      Teacher: {section.teacher.name || section.teacher.email} · Joined {timeAgo(section.joinedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{section.completed}<span className="text-gray-400 font-normal">/{section.total}</span></p>
                    <p className="text-xs text-gray-400">completed</p>
                  </div>
                  <div className="w-24">
                    <ProgressBar completed={section.completed} total={section.total} />
                  </div>
                  <ChevronRight size={16} className={`text-gray-400 transition-transform ${openWiki === section.wikiSlug ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Lesson list */}
              {openWiki === section.wikiSlug && (
                <div className="divide-y divide-gray-50">
                  {section.lessons.length === 0 && (
                    <p className="px-4 py-3 text-xs text-gray-400">No published lessons yet.</p>
                  )}
                  {section.lessons.map(lesson => (
                    <div key={lesson.id} className="flex items-center gap-3 px-4 py-2.5">
                      <StatusIcon status={lesson.status} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${lesson.status === 'not_started' ? 'text-gray-400' : 'text-gray-800'}`}>
                          {lesson.order}. {lesson.title}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {lesson.status === 'completed' && lesson.completedAt && (
                          <p className="text-xs text-emerald-600">Completed {timeAgo(lesson.completedAt)}</p>
                        )}
                        {lesson.status === 'in_progress' && lesson.lastViewedAt && (
                          <p className="text-xs text-blue-500">Viewed {timeAgo(lesson.lastViewedAt)}</p>
                        )}
                        {lesson.status === 'not_started' && (
                          <p className="text-xs text-gray-300">Not started</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Wiki summary bar */}
                  <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      <span className="text-emerald-600 font-medium">{section.completed} done</span>
                      {section.inProgress > 0 && <span className="text-blue-500 font-medium ml-2">{section.inProgress} in progress</span>}
                      <span className="ml-2">{section.total - section.completed - section.inProgress} not started</span>
                    </span>
                    <span>{section.total > 0 ? Math.round(section.completed / section.total * 100) : 0}% complete</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        {data && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Member since {new Date(data.student.createdAt).toLocaleDateString()}</span>
            <span>{data.sections.length} wiki{data.sections.length !== 1 ? 's' : ''} enrolled</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentsSection() {
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

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

  const filtered = students.filter(s =>
    !search ||
    s.student.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Students <span className="text-sm font-normal text-gray-400 ml-1">{students.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-gray-400 w-40"
          />
          <button onClick={load} className="text-sm text-gray-500 hover:text-gray-900">↻</button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && students.length === 0 && (
        <p className="text-sm text-gray-500">No students enrolled yet.</p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2 pr-4 font-medium w-6">#</th>
                <th className="pb-2 pr-4 font-medium">Student</th>
                <th className="pb-2 pr-4 font-medium">Wikis</th>
                <th className="pb-2 pr-4 font-medium">Overall progress</th>
                <th className="pb-2 pr-4 font-medium">Joined</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s, i) => (
                <tr key={s.student.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedId(s.student.id)}>
                  <td className="py-3 pr-4 text-gray-400">{i + 1}</td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-900">{s.student.name || '—'}</p>
                    <p className="text-xs text-gray-400">{s.student.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {s.wikis.map(w => (
                        <span key={w.wikiSlug} className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100">
                          {w.wikiSlug}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4 w-48">
                    <div className="space-y-0.5">
                      <ProgressBar completed={s.totalCompleted} total={s.totalLessons} />
                      <p className="text-xs text-gray-400">{s.totalCompleted} / {s.totalLessons} lessons</p>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-xs text-gray-400">
                    {new Date(s.student.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-primary hover:underline flex items-center gap-0.5">
                      Details <ChevronRight size={12} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedId && (
        <StudentModal studentId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
