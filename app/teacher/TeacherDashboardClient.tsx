"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Cairo } from 'next/font/google'
import { Home, Layout, ChevronLeft, Link2, Copy, Check, Power, RefreshCw, Users, Trash2, Clock, Circle, X, Download, Route, Plus, Pencil, GraduationCap, UserPlus, CalendarDays } from 'lucide-react'
import SignOutButton from '@/components/sign-out-button'
import { classStatus, type ClassStatus } from '@/lib/class-window'

const display = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-cairo' })

function Avatar({ name, email, src, size = 'sm' }: { name: string | null; email: string; src?: string | null; size?: 'sm' | 'md' }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase()
  const sizes = { sm: 'w-9 h-9 text-sm', md: 'w-11 h-11 text-base' }
  return (
    <div className={`${sizes[size]} relative overflow-hidden rounded-xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] flex items-center justify-center font-bold text-white shrink-0`}>
      {src ? <Image src={src} alt={name || email} fill sizes={size === 'md' ? '44px' : '36px'} className="object-cover" /> : initials}
    </div>
  )
}

type Wiki = { slug: string; displayName: string }
type LinkInfo = {
  id: string
  token: string
  name: string | null
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  _count: { enrollments: number }
}

// yyyy-mm-dd for <input type="date">
function toDateInput(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function prettyDate(value?: string | null) {
  if (!value) return ''
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : ''
}

const STATUS_META: Record<ClassStatus, { label: string; dot: string; chip: string }> = {
  active: { label: 'Running', dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700' },
  scheduled: { label: 'Scheduled', dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700' },
  ended: { label: 'Ended', dot: 'bg-slate-400', chip: 'bg-slate-200 text-slate-700' },
  off: { label: 'Off', dot: 'bg-[#B08981]', chip: 'bg-[#F1EBE9] text-[#8B6B65]' },
}
type Student = {
  enrollmentId: string
  joinedAt: string
  status: 'active' | 'removed' | 'revoked'
  removedAt: string | null
  student: { id: string; email: string; name: string | null; avatarUrl: string | null }
  link: { id: string; isActive: boolean; name?: string | null }
  progress: { completed: number; in_progress: number; total: number }
  totalTimeSpentSec?: number
  lessons: {
    id: string
    title: string
    order: number
    duration_min: number
    status: 'completed' | 'in_progress' | 'not_started'
    completedAt: string | null
    lastViewedAt: string | null
    timeSpentSec?: number
  }[]
}

// Active time a student spent, e.g. "12m 30s" / "1h 05m".
function formatDuration(totalSeconds?: number) {
  const s = Math.max(0, Math.floor(totalSeconds || 0))
  if (s === 0) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`
  return `${sec}s`
}

type StudentMatch = {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
  alreadyInCourse: boolean
}

type Props = {
  wikis: Wiki[]
  user: { name: string | null; email: string }
}

const STUDENT_CAP = 35

function progressPct(progress: Student['progress']) {
  return progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
}

function escapeExcelCell(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value)
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function lessonStatusLabel(status: Student['lessons'][number]['status']) {
  if (status === 'completed') return 'Completed'
  if (status === 'in_progress') return 'In progress'
  return 'Not started'
}

function enrollmentStatusLabel(status: Student['status']) {
  if (status === 'revoked') return 'Link disabled'
  if (status === 'removed') return 'Removed'
  return 'Active'
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  return new Date(value).toLocaleDateString()
}

function ProgressBar({ progress }: { progress: Student['progress'] }) {
  const pct = progressPct(progress)
  return (
    <div className="min-w-[180px]">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-slate-500">{progress.completed} of {progress.total} lessons</span>
        <span className="font-semibold tabular-nums text-slate-700">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(pct, progress.completed > 0 ? 4 : 0)}%` }} />
      </div>
    </div>
  )
}

function LessonStatus({ status }: { status: Student['lessons'][number]['status'] }) {
  if (status === 'completed') {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700"><Check size={13} /> Done</span>
  }
  if (status === 'in_progress') {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700"><Clock size={13} /> In progress</span>
  }
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EBE9] px-2.5 py-1 text-xs font-bold text-[#8B6B65]"><Circle size={13} /> Not started</span>
}

function ProgressDialog({ student, onClose }: { student: Student; onClose: () => void }) {
  const pct = progressPct(student.progress)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#F2E1DD] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-[#F3E7E4] px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={student.student.name} email={student.student.email} src={student.student.avatarUrl} size="md" />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-[#1A1110]">{student.student.name || 'Unnamed student'}</h2>
              <p className="truncate text-sm text-[#8B6B65]">{student.student.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#B08981] hover:bg-[#FBF3F1] hover:text-[#1A1110]" aria-label="Close progress dialog">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-[#F3E7E4] bg-[#FBF7F5] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#8B6B65]">Overall progress</p>
              <p className="text-2xl font-extrabold text-[#1A1110]">{pct}% complete</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#6B4F4A]">
                {student.progress.completed} of {student.progress.total} lessons completed
              </p>
              <p className="mt-0.5 text-sm text-[#8B6B65]">
                Active time: <span className="font-bold tabular-nums text-[#1A1110]">{formatDuration(student.totalTimeSpentSec)}</span>
              </p>
            </div>
          </div>
          <div className="mt-3"><ProgressBar progress={student.progress} /></div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {student.lessons.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#EBD9D5] bg-[#FBF7F5] px-4 py-8 text-center text-sm text-[#8B6B65]">
              No published lessons in this class yet.
            </p>
          ) : (
            <div className="space-y-2">
              {student.lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#F3E7E4] bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1A1110]">{lesson.order}. {lesson.title}</p>
                    <p className="text-xs text-[#8B6B65]">
                      {lesson.duration_min} min estimated
                      {lesson.timeSpentSec ? <> · <span className="font-semibold text-[#6B4F4A] tabular-nums">{formatDuration(lesson.timeSpentSec)} spent</span></> : null}
                    </p>
                  </div>
                  <LessonStatus status={lesson.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-[#F3E7E4] bg-[#FBF7F5] px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-[#EBD9D5] bg-white px-4 py-2 text-sm font-semibold text-[#6B4F4A] hover:bg-[#FBF3F1]">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Lets a teacher put a student straight into a class instead of sharing the
// invite link. If the email already has a student account it is enrolled as-is
// (the password field is then ignored — see the API route).
function AddStudentDialog({
  className,
  wikiSlug,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  className: string
  wikiSlug: string
  busy: boolean
  error: string | null
  onClose: () => void
  onSubmit: (payload: { name: string; email: string; password: string }) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [matches, setMatches] = useState<StudentMatch[]>([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState<StudentMatch | null>(null)

  // Debounced lookup of students who already have an account, so the teacher
  // can pick one instead of creating a duplicate.
  useEffect(() => {
    if (picked) return
    const q = name.trim()
    if (q.length < 2) { setMatches([]); return }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/teacher/students/search?q=${encodeURIComponent(q)}&wikiSlug=${encodeURIComponent(wikiSlug)}`)
        const data = await res.json()
        if (!cancelled) setMatches(res.ok ? (data.students || []) : [])
      } catch {
        if (!cancelled) setMatches([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [name, picked, wikiSlug])

  const canSubmit = picked
    ? !busy && !picked.alreadyInCourse
    : email.trim().length > 0 && password.length >= 8 && !busy

  function submit() {
    if (!canSubmit) return
    if (picked) onSubmit({ name: '', email: picked.email, password: '' })
    else onSubmit({ name, email, password })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); submit() }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#F2E1DD] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#F3E7E4] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-[#1A1110]">Add student</h2>
            <p className="mt-0.5 text-sm text-[#8B6B65]">to {className}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#B08981] hover:bg-[#FBF3F1] hover:text-[#1A1110]" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {picked ? (
            // An existing account was chosen — nothing to create, just enroll.
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#6B4F4A]">Existing student</label>
              <div className="flex items-center gap-3 rounded-xl border border-[#EBD9D5] bg-[#FBF7F5] px-3.5 py-3">
                <Avatar name={picked.name} email={picked.email} src={picked.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-[#1A1110]">{picked.name || 'Unnamed student'}</p>
                  <p className="truncate text-sm text-[#8B6B65]">{picked.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPicked(null); setName(''); setMatches([]) }}
                  className="shrink-0 rounded-lg border border-[#EBD9D5] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B4F4A] hover:bg-[#FBF3F1]"
                >
                  Change
                </button>
              </div>
              {picked.alreadyInCourse ? (
                <p className="mt-1.5 text-xs font-semibold text-[#E23B2E]">
                  Already in another class of this course — a student can only be in one class per course.
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-[#B08981]">
                  They keep their existing password — it is not changed.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                <label className="mb-1.5 block text-sm font-semibold text-[#6B4F4A]">
                  Name <span className="font-normal text-[#B08981]">— search existing students, or type a new name</span>
                </label>
                <input
                  value={name} onChange={(e) => setName(e.target.value)} autoComplete="off"
                  className="w-full rounded-xl border border-[#EBD9D5] bg-white px-3.5 py-2.5 text-[15px] text-[#1A1110] outline-none focus:border-[#E23B2E]"
                  placeholder="Start typing a name or email…"
                />
                {searching && <p className="mt-1.5 text-xs text-[#B08981]">Searching…</p>}

                {!searching && matches.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-[#EBD9D5] bg-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)]">
                    <p className="border-b border-[#F3E7E4] bg-[#FBF7F5] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#B08981]">
                      Already registered
                    </p>
                    <ul className="max-h-56 overflow-y-auto">
                      {matches.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            disabled={m.alreadyInCourse}
                            onClick={() => { setPicked(m); setMatches([]) }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#FBF3F1] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                          >
                            <Avatar name={m.name} email={m.email} src={m.avatarUrl} size="sm" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-[#1A1110]">{m.name || 'Unnamed student'}</span>
                              <span className="block truncate text-xs text-[#8B6B65]">{m.email}</span>
                            </span>
                            {m.alreadyInCourse && (
                              <span className="shrink-0 rounded-full bg-[#F1EBE9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8B6B65]">
                                In this course
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!searching && name.trim().length >= 2 && matches.length === 0 && (
                  <p className="mt-1.5 text-xs text-[#B08981]">No existing student matched — fill in the details below to create a new account.</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#6B4F4A]">Email</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off"
                  className="w-full rounded-xl border border-[#EBD9D5] bg-white px-3.5 py-2.5 text-[15px] text-[#1A1110] outline-none focus:border-[#E23B2E]"
                  placeholder="student@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#6B4F4A]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required minLength={8} value={password}
                    onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
                    className="w-full rounded-xl border border-[#EBD9D5] bg-white px-3.5 py-2.5 pr-16 text-[15px] text-[#1A1110] outline-none focus:border-[#E23B2E]"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 my-auto h-7 rounded-lg px-2 text-xs font-bold text-[#B08981] hover:bg-[#FBF3F1] hover:text-[#1A1110]"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-[#B08981]">
                  Share these details with the student so they can sign in. If the email already has an account, it is added to this class and its existing password is kept.
                </p>
              </div>
            </>
          )}

          {error && (
            <p className="rounded-xl border border-[#F6C9C1] bg-[#FDEDEA] px-3.5 py-2.5 text-sm font-medium text-[#E23B2E]" role="alert">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-[#F3E7E4] bg-[#FBF7F5] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#EBD9D5] bg-white px-4 py-2.5 text-sm font-semibold text-[#6B4F4A] hover:bg-[#FBF3F1]">
            Cancel
          </button>
          <button
            type="submit" disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#E23B2E]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus size={16} /> {busy ? 'Adding…' : picked ? 'Add to class' : 'Create & add'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function TeacherDashboardClient({ wikis, user }: Props) {
  const [wikiSlug, setWikiSlug] = useState(wikis[0]?.slug || '')
  const [links, setLinks] = useState<LinkInfo[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showFormer, setShowFormer] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [addBusy, setAddBusy] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [scheduleStart, setScheduleStart] = useState('')
  const [scheduleEnd, setScheduleEnd] = useState('')
  const [savingSchedule, setSavingSchedule] = useState(false)

  // Classes for the selected course (wiki). Oldest first so the "Class N"
  // fallback numbering for unnamed classes stays stable as new ones are added.
  const classes = useMemo(
    () => [...links].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [links]
  )
  const selectedClass = classes.find((c) => c.id === selectedClassId) || null

  const classLabel = useCallback((link: { id: string; name?: string | null } | null) => {
    if (!link) return ''
    if (link.name && link.name.trim()) return link.name.trim()
    const i = classes.findIndex((c) => c.id === link.id)
    return `Class ${i >= 0 ? i + 1 : classes.length + 1}`
  }, [classes])

  const classStudents = selectedClass ? students.filter((s) => s.link?.id === selectedClass.id) : []
  const activeStudents = classStudents.filter((s) => s.status === 'active')
  const formerStudents = classStudents.filter((s) => s.status !== 'active')

  const load = useCallback(async () => {
    if (!wikiSlug) return
    setLoading(true)
    setError(null)
    try {
      const [linksRes, studentsRes] = await Promise.all([
        fetch(`/api/teacher/links?wikiSlug=${wikiSlug}`),
        fetch(`/api/teacher/students?wikiSlug=${wikiSlug}`),
      ])
      const linksData = await linksRes.json()
      const studentsData = await studentsRes.json()
      if (!linksRes.ok) throw new Error(linksData.error)
      if (!studentsRes.ok) throw new Error(studentsData.error)
      setLinks(linksData.links || [])
      setStudents(studentsData.students || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [wikiSlug])

  useEffect(() => { load() }, [load])

  // Keep a valid class selected: preserve the current pick if it still exists,
  // otherwise fall back to the first active class (or the first class).
  useEffect(() => {
    if (links.length === 0) { setSelectedClassId(null); return }
    setSelectedClassId((prev) => {
      if (prev && links.some((l) => l.id === prev)) return prev
      const ordered = [...links].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      const firstActive = ordered.find((l) => l.isActive)
      return (firstActive || ordered[0]).id
    })
  }, [links])

  useEffect(() => {
    if (!selectedStudent) return
    const fresh = students.find((s) => s.enrollmentId === selectedStudent.enrollmentId) || null
    if (fresh !== selectedStudent) setSelectedStudent(fresh)
  }, [students, selectedStudent])

  // Keep the date inputs in sync with whichever class is selected.
  useEffect(() => {
    setScheduleStart(toDateInput(selectedClass?.startsAt))
    setScheduleEnd(toDateInput(selectedClass?.endsAt))
  }, [selectedClass?.id, selectedClass?.startsAt, selectedClass?.endsAt])

  async function saveSchedule() {
    if (!selectedClass) return
    setSavingSchedule(true)
    try {
      const res = await fetch(`/api/teacher/links/${selectedClass.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startsAt: scheduleStart, endsAt: scheduleEnd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
      setNotice(
        scheduleStart || scheduleEnd
          ? 'Class dates saved. Access follows this schedule automatically.'
          : 'Class dates cleared — the class stays open until you turn it off.',
      )
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSavingSchedule(false)
    }
  }

  async function createClass() {
    const name = window.prompt('Name this class (optional) — e.g. "Grade 5A":', '')
    if (name === null) return // cancelled
    setBusy(true)
    try {
      const res = await fetch('/api/teacher/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wikiSlug, name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
      if (data.link?.id) setSelectedClassId(data.link.id)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function renameClass(link: LinkInfo) {
    const name = window.prompt('Class name:', link.name || '')
    if (name === null) return
    try {
      const res = await fetch(`/api/teacher/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function regenerateLink(link: LinkInfo) {
    if (!confirm('Generate a new invite link for this class? The current link will stop working. Students already enrolled keep their access.')) return
    try {
      const res = await fetch(`/api/teacher/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function toggleClass(link: LinkInfo) {
    const disable = link.isActive
    if (disable && !confirm('Turning this class off will revoke access for ALL its students. Their progress stays available under "Former students". Continue?')) return
    try {
      const res = await fetch(`/api/teacher/links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !disable }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function addStudent(payload: { name: string; email: string; password: string }) {
    if (!selectedClass) return
    setAddBusy(true)
    setAddError(null)
    try {
      const res = await fetch('/api/teacher/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, linkId: selectedClass.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowAddStudent(false)
      setNotice(
        data.alreadyInClass
          ? `${payload.email} is already in this class.`
          : data.createdAccount
            ? `Account created for ${payload.email} and added to ${classLabel(selectedClass)}.`
            : `${payload.email} already had an account — added to ${classLabel(selectedClass)} with their existing password.`,
      )
      await load()
    } catch (e: any) {
      setAddError(e.message)
    } finally {
      setAddBusy(false)
    }
  }

  async function removeStudent(s: Student) {
    if (!confirm(`Remove ${s.student.name || s.student.email}? They will lose access immediately.`)) return
    try {
      const res = await fetch(`/api/teacher/students/${s.enrollmentId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/join/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function exportStudentsToExcel() {
    const currentWiki = wikis.find((w) => w.slug === wikiSlug)
    const lessonColumns = classStudents[0]?.lessons || []
    const columns = [
      '#',
      'Student name',
      'Email',
      'Joined',
      'Status',
      'Completion',
      'Completed lessons',
      'In progress',
      'Total lessons',
      'Active time',
      ...lessonColumns.map((lesson) => `${lesson.order}. ${lesson.title}`),
    ]
    const rows = classStudents.map((student, index) => [
      index + 1,
      student.student.name || '',
      student.student.email,
      formatDate(student.joinedAt),
      enrollmentStatusLabel(student.status),
      `${progressPct(student.progress)}%`,
      student.progress.completed,
      student.progress.in_progress,
      student.progress.total,
      formatDuration(student.totalTimeSpentSec),
      ...lessonColumns.map((lesson) => {
        const match = student.lessons.find((item) => item.id === lesson.id)
        return lessonStatusLabel(match?.status || 'not_started')
      }),
    ])
    const table = `
      <table>
        <thead>
          <tr>${columns.map((column) => `<th>${escapeExcelCell(column)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td style="mso-number-format:'\\@';">${escapeExcelCell(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `
    const title = `${currentWiki?.displayName || wikiSlug || 'Course'} — ${classLabel(selectedClass)}`
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Progress</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        </head>
        <body>
          <h1>${escapeExcelCell(title)} progress</h1>
          ${table}
        </body>
      </html>
    `
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    const slugPart = classLabel(selectedClass).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    link.href = url
    link.download = `${wikiSlug || 'course'}-${slugPart || 'class'}-progress-${date}.xls`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const joinUrl = selectedClass
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${selectedClass.token}`
    : null

  const displayName = user.name || user.email

  return (
    <div className={`${display.variable} rgx-dash min-h-screen bg-[#f4f6f8] text-[#1A1110]`}>
      <header className="fixed inset-x-0 top-0 z-40 flex h-[68px] items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link href="/home"><Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={150} height={44} priority className="h-11 w-auto" /></Link>
        <div className="ml-auto"><Avatar name={user.name} email={user.email} size="sm" /></div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-white/10 bg-[#1A1110] px-4 py-5 text-white lg:flex">
        <Link href="/home" className="flex h-14 items-center px-2"><Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={176} height={50} priority className="h-12 w-auto" /></Link>
        <p className="mt-6 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Workspace</p>
        <nav className="mt-2 space-y-1">
          <Link href="/home" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold text-white/60 transition hover:bg-white/[0.07] hover:text-white"><Home size={18} /> Home</Link>
          <Link href="/teacher" className="flex items-center gap-3 rounded-xl bg-[#F0523F] px-3.5 py-3 text-[15px] font-semibold text-white shadow-[0_12px_28px_-16px_rgba(240,82,63,.9)]"><Layout size={18} /> My classes</Link>
          <Link href="/teacher/tracks" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold text-white/60 transition hover:bg-white/[0.07] hover:text-white"><Route size={18} /> Tracks</Link>
        </nav>
        <p className="mt-7 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Courses</p>
        <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
          {wikis.length === 0 ? <p className="px-3 py-3 text-sm leading-5 text-white/40">No courses assigned yet.</p> : wikis.map((wiki) => (
            <button key={wiki.slug} type="button" onClick={() => setWikiSlug(wiki.slug)} className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${wikiSlug === wiki.slug ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/[0.06] hover:text-white'}`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${wikiSlug === wiki.slug ? 'bg-[#F0523F]' : 'bg-white/20'}`} /><span className="truncate">{wiki.displayName}</span>
            </button>
          ))}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-3">
          <div className="flex items-center gap-3 p-1.5"><Avatar name={user.name} email={user.email} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{displayName}</p><p className="truncate text-xs text-white/40">{user.email}</p></div></div>
          <SignOutButton iconSize={16} className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/50 transition hover:bg-white/[0.06] hover:text-white">Sign out</SignOutButton>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 rounded-2xl border border-black/10 bg-[#1A1110]/95 p-1.5 shadow-2xl backdrop-blur lg:hidden">
        <Link href="/home" className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold text-white/55"><Home size={17} />Home</Link>
        <Link href="/teacher" className="flex flex-col items-center gap-1 rounded-xl bg-[#F0523F] py-2 text-[10px] font-bold text-white"><Layout size={17} />Classes</Link>
        <Link href="/teacher/tracks" className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold text-white/55"><Route size={17} />Tracks</Link>
        <SignOutButton iconSize={17} className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold text-white/55">Sign out</SignOutButton>
      </nav>

      <main className="w-full px-4 pb-28 pt-[92px] sm:px-6 lg:ml-[272px] lg:w-[calc(100%-272px)] lg:pb-16 lg:pt-10 xl:px-10">
        <div className="mx-auto max-w-[1180px] space-y-8">

        {/* Header */}
        <div>
          <Link href="/home" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#B08981] transition-colors hover:text-[#E23B2E] lg:hidden">
            <ChevronLeft size={16} /> Back to home
          </Link>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1A1110]">My classes</h1>
          <p className="text-lg text-[#8B6B65] mt-2">Create classes for each course, share invite links, and track your students’ progress.</p>
        </div>

        <div className="hidden justify-end lg:flex">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[15px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Course tabs */}
        <div className="flex flex-wrap items-center gap-2.5 lg:hidden">
          {wikis.map((w) => (
            <button
              key={w.slug}
              onClick={() => setWikiSlug(w.slug)}
              className={`px-5 py-2.5 rounded-xl text-[15px] font-bold border transition-all ${
                wikiSlug === w.slug
                  ? 'bg-[#1A1110] text-white border-[#1A1110] shadow-lg shadow-[#1A1110]/15'
                  : 'bg-white text-[#6B4F4A] border-[#EBD9D5] hover:border-[#E23B2E]/50 hover:text-[#1A1110]'
              }`}
            >
              {w.displayName}
            </button>
          ))}
          <button
            onClick={load}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[15px] font-semibold text-[#B08981] hover:text-[#1A1110] border border-transparent hover:border-[#EBD9D5] transition-all"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <p className="text-base font-medium text-[#E23B2E] bg-[#FDEDEA] border border-[#F6C9C1] rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Classes for the selected course */}
        <div className="rounded-[1.7rem] border border-[#F2E1DD] bg-white shadow-[0_24px_50px_-42px_rgba(226,59,46,0.5)] p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#FDEDEA] flex items-center justify-center text-[#E23B2E]">
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1A1110]">Classes</h2>
                <p className="text-sm text-[#8B6B65]">{classes.length} {classes.length === 1 ? 'class' : 'classes'} in {wikis.find(w => w.slug === wikiSlug)?.displayName || 'this course'}</p>
              </div>
            </div>
            <button
              onClick={createClass}
              disabled={busy || !wikiSlug}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] text-white text-[15px] font-bold shadow-lg shadow-[#E23B2E]/25 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={17} /> New class
            </button>
          </div>

          {classes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#EBD9D5] bg-[#FBF7F5] px-4 py-6 text-center text-base text-[#8B6B65]">
              No classes yet. Create your first class to get an invite link to share with students.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {classes.map((c) => {
                const selected = c.id === selectedClassId
                const st = classStatus(c)
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClassId(c.id)}
                    className={`group inline-flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-left transition-all ${
                      selected
                        ? 'bg-[#1A1110] text-white border-[#1A1110] shadow-lg shadow-[#1A1110]/15'
                        : 'bg-white text-[#6B4F4A] border-[#EBD9D5] hover:border-[#E23B2E]/50 hover:text-[#1A1110]'
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_META[st].dot}`} />
                    <span className="font-bold">{classLabel(c)}</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${selected ? 'text-white/70' : 'text-[#B08981]'}`}>
                      <Users size={12} /> {c._count.enrollments}
                    </span>
                    {st !== 'active' && (
                      <span className={`text-[11px] font-bold uppercase tracking-wide ${selected ? 'text-white/60' : 'text-[#B08981]'}`}>
                        {STATUS_META[st].label}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Selected class: invite link */}
        {selectedClass && (
        <div className="rounded-[1.7rem] border border-[#F2E1DD] bg-white shadow-[0_24px_50px_-42px_rgba(226,59,46,0.5)] p-7">
          <div className="flex items-center justify-between mb-5 gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#FDEDEA] flex items-center justify-center text-[#E23B2E]">
                <Link2 size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#1A1110] truncate">{classLabel(selectedClass)}</h2>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STATUS_META[classStatus(selectedClass)].chip}`}>
                    {STATUS_META[classStatus(selectedClass)].label}
                  </span>
                  <button
                    onClick={() => renameClass(selectedClass)}
                    className="shrink-0 rounded-lg p-1.5 text-[#B08981] transition hover:bg-[#FBF3F1] hover:text-[#1A1110]"
                    aria-label="Rename class"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
                <p className="text-sm text-[#8B6B65]">Invite link for this class</p>
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-[#6B4F4A] bg-[#FBF3F1] border border-[#EBD9D5] px-3 py-1.5 rounded-full">
              <Users size={15} className="text-[#B08981]" /> {activeStudents.length} / {STUDENT_CAP}
            </span>
          </div>

          {selectedClass.isActive ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-[#FBF3F1] border border-[#EBD9D5] rounded-xl px-4 py-3">
                <span className="text-base text-[#6B4F4A] flex-1 truncate font-mono">{joinUrl}</span>
                <button
                  onClick={() => copyLink(selectedClass.token)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors ${
                    copied ? 'bg-emerald-500 text-white' : 'bg-[#1A1110] text-white hover:opacity-90'
                  }`}
                >
                  {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => toggleClass(selectedClass)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E23B2E] text-white text-[15px] font-bold hover:opacity-90"
                >
                  <Power size={16} /> Turn off class
                </button>
                <button
                  onClick={() => regenerateLink(selectedClass)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#EBD9D5] text-[15px] font-semibold text-[#6B4F4A] hover:bg-[#FBF3F1]"
                >
                  <RefreshCw size={16} /> Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-base text-[#8B6B65]">This class is turned off. Turn it back on to let students join with a link.</p>
              <button
                onClick={() => toggleClass(selectedClass)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] text-white text-[15px] font-bold shadow-lg shadow-[#E23B2E]/25 hover:-translate-y-0.5 transition-transform"
              >
                <Power size={17} /> Turn on class
              </button>
            </div>
          )}

          {/* Optional schedule — access follows these dates automatically. */}
          <div className="mt-6 border-t border-[#F3E7E4] pt-5">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays size={17} className="text-[#B08981]" />
              <h3 className="text-[15px] font-bold text-[#1A1110]">Class dates <span className="font-normal text-[#B08981]">(optional)</span></h3>
            </div>

            {classStatus(selectedClass) === 'scheduled' && (
              <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800">
                Students can’t join or open the course until {prettyDate(selectedClass.startsAt)}.
              </p>
            )}
            {classStatus(selectedClass) === 'ended' && (
              <p className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700">
                This class ended on {prettyDate(selectedClass.endsAt)}. Students can no longer open the course — change the end date to reopen it.
              </p>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#B08981]">Starts</label>
                <input
                  type="date" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)}
                  className="rounded-xl border border-[#EBD9D5] bg-white px-3 py-2 text-sm text-[#1A1110] outline-none focus:border-[#E23B2E]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#B08981]">Ends</label>
                <input
                  type="date" value={scheduleEnd} min={scheduleStart || undefined}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                  className="rounded-xl border border-[#EBD9D5] bg-white px-3 py-2 text-sm text-[#1A1110] outline-none focus:border-[#E23B2E]"
                />
              </div>
              <button
                onClick={saveSchedule} disabled={savingSchedule}
                className="rounded-xl bg-[#1A1110] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {savingSchedule ? 'Saving…' : 'Save dates'}
              </button>
              {(scheduleStart || scheduleEnd) && (
                <button
                  onClick={() => { setScheduleStart(''); setScheduleEnd('') }}
                  className="rounded-xl border border-[#EBD9D5] px-4 py-2.5 text-sm font-semibold text-[#6B4F4A] hover:bg-[#FBF3F1]"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-[#B08981]">
              Leave empty to keep the class open until you turn it off. The class runs through the whole end date, then closes itself — students lose access and can’t join, but their progress is kept.
            </p>
          </div>
        </div>
        )}

        {/* Students in the selected class */}
        {selectedClass && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div><h2 className="text-lg font-bold text-slate-900">Students</h2><p className="mt-0.5 text-sm text-slate-500">{activeStudents.length} active · {formerStudents.length} former</p></div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setAddError(null); setShowAddStudent(true) }}
                disabled={!selectedClass?.isActive}
                title={selectedClass?.isActive ? undefined : 'Turn the class on to add students'}
                className="inline-flex items-center gap-2 rounded-md bg-[#1A1110] px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <UserPlus size={15} /> Add student
              </button>
              <button
                onClick={exportStudentsToExcel}
                disabled={classStudents.length === 0}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Download size={15} /> Export Excel
              </button>
            </div>
          </div>

          {notice && (
            <div className="flex items-start justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-5 py-3">
              <p className="text-sm font-medium text-emerald-800">{notice}</p>
              <button onClick={() => setNotice(null)} className="shrink-0 rounded p-0.5 text-emerald-700 hover:bg-emerald-100" aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          )}

          {loading && <p className="px-5 py-4 text-base text-[#8B6B65]">Loading…</p>}

          {!loading && classStudents.length === 0 && (
            <div className="py-10 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#FDEDEA] flex items-center justify-center text-[#E23B2E]">
                <Users size={26} />
              </div>
              <p className="text-lg font-bold text-[#1A1110] mb-1">No students yet</p>
              <p className="text-base text-[#8B6B65]">Share this class’s invite link to get students enrolled.</p>
            </div>
          )}

          {!loading && classStudents.length > 0 && activeStudents.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#EBD9D5] bg-[#FBF7F5] px-4 py-6 text-center text-base text-[#8B6B65]">
              No active students right now. Past students are listed below.
            </p>
          )}

          {!loading && activeStudents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2.5">Student</th>
                    <th className="px-4 py-2.5">Joined</th>
                    <th className="px-4 py-2.5">Progress</th>
                    <th className="px-5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeStudents.map((s) => (
                    <tr key={s.enrollmentId} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.student.name} email={s.student.email} src={s.student.avatarUrl} size="sm" />
                          <div className="min-w-0">
                            <p className="text-[15px] font-bold text-[#1A1110] truncate">{s.student.name || '—'}</p>
                            <p className="text-sm text-[#8B6B65] truncate">{s.student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">{new Date(s.joinedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><ProgressBar progress={s.progress} /></td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedStudent(s)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => removeStudent(s)}
                            className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${s.student.name || s.student.email}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Former students — enrollments revoked by disabling the class, or removed manually */}
          {!loading && formerStudents.length > 0 && (
            <div className="mt-6 border-t border-[#F3E7E4] px-5 pt-5 pb-5">
              <button
                onClick={() => setShowFormer(!showFormer)}
                className="inline-flex items-center gap-2 text-[15px] font-bold text-[#6B4F4A] hover:text-[#1A1110] transition-colors"
              >
                <ChevronLeft size={16} className={`transition-transform ${showFormer ? '-rotate-90' : 'rotate-180'}`} />
                Former students ({formerStudents.length})
              </button>
              <p className="mt-1 text-sm text-[#B08981]">
                Students whose class was turned off or who were removed. Their progress is kept.
              </p>

              {showFormer && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-2.5">Student</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Progress</th>
                        <th className="px-5 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formerStudents.map((s) => (
                        <tr key={s.enrollmentId} className="opacity-80 transition-colors hover:bg-slate-50/70">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={s.student.name} email={s.student.email} src={s.student.avatarUrl} size="sm" />
                              <div className="min-w-0">
                                <p className="text-[15px] font-bold text-[#1A1110] truncate">{s.student.name || '—'}</p>
                                <p className="text-sm text-[#8B6B65] truncate">{s.student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EBE9] px-2.5 py-1 text-xs font-bold text-[#8B6B65]">
                              <Power size={12} /> {enrollmentStatusLabel(s.status)}
                            </span>
                            {s.removedAt && (
                              <p className="mt-1 text-xs text-[#B08981]">{new Date(s.removedAt).toLocaleDateString()}</p>
                            )}
                          </td>
                          <td className="px-4 py-3"><ProgressBar progress={s.progress} /></td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={() => setSelectedStudent(s)}
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        )}
        </div>
      </main>
      {selectedStudent && (
        <ProgressDialog student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
      {showAddStudent && selectedClass && (
        <AddStudentDialog
          className={classLabel(selectedClass)}
          wikiSlug={wikiSlug}
          busy={addBusy}
          error={addError}
          onClose={() => setShowAddStudent(false)}
          onSubmit={addStudent}
        />
      )}
    </div>
  )
}
