"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Cairo } from 'next/font/google'
import { Home, Layout, ChevronLeft, Link2, Copy, Check, Power, RefreshCw, Users, Trash2, Eye, Clock, Circle, X, Download } from 'lucide-react'
import SignOutButton from '@/components/sign-out-button'

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
  isActive: boolean
  createdAt: string
  _count: { enrollments: number }
}
type Student = {
  enrollmentId: string
  joinedAt: string
  status: 'active' | 'removed' | 'revoked'
  removedAt: string | null
  student: { id: string; email: string; name: string | null; avatarUrl: string | null }
  link: { id: string; isActive: boolean }
  progress: { completed: number; in_progress: number; total: number }
  lessons: {
    id: string
    title: string
    order: number
    duration_min: number
    status: 'completed' | 'in_progress' | 'not_started'
    completedAt: string | null
    lastViewedAt: string | null
  }[]
}

type Props = {
  wikis: Wiki[]
  user: { name: string | null; email: string }
}

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
    <div className="flex min-w-[190px] items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F1E4E1]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#F0523F] to-[#E23B2E]" style={{ width: `${Math.max(pct, progress.completed > 0 ? 4 : 0)}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-bold text-[#1A1110]">{pct}%</span>
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
            <p className="text-sm font-semibold text-[#6B4F4A]">
              {student.progress.completed} of {student.progress.total} lessons completed
            </p>
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
                    <p className="text-xs text-[#8B6B65]">{lesson.duration_min} min</p>
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

export default function TeacherDashboardClient({ wikis, user }: Props) {
  const [wikiSlug, setWikiSlug] = useState(wikis[0]?.slug || '')
  const [links, setLinks] = useState<LinkInfo[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showFormer, setShowFormer] = useState(false)

  const activeLink = links.find((l) => l.isActive) || null
  const activeStudents = students.filter((s) => s.status === 'active')
  const formerStudents = students.filter((s) => s.status !== 'active')

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

  useEffect(() => {
    if (!selectedStudent) return
    const fresh = students.find((s) => s.enrollmentId === selectedStudent.enrollmentId) || null
    if (fresh !== selectedStudent) setSelectedStudent(fresh)
  }, [students, selectedStudent])

  async function generateLink() {
    if (activeLink && !confirm('This will replace the current active link. Students already enrolled keep access — new students will use the new link. Continue?')) return
    try {
      const res = await fetch('/api/teacher/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wikiSlug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function toggleLink(link: LinkInfo) {
    const disable = link.isActive
    if (disable && !confirm('Turning this link off will revoke access for ALL students enrolled through it. Their progress stays available under "Former students". Continue?')) return
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
    const lessonColumns = students[0]?.lessons || []
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
      ...lessonColumns.map((lesson) => `${lesson.order}. ${lesson.title}`),
    ]
    const rows = students.map((student, index) => [
      index + 1,
      student.student.name || '',
      student.student.email,
      formatDate(student.joinedAt),
      enrollmentStatusLabel(student.status),
      `${progressPct(student.progress)}%`,
      student.progress.completed,
      student.progress.in_progress,
      student.progress.total,
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
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Progress</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        </head>
        <body>
          <h1>${escapeExcelCell(currentWiki?.displayName || wikiSlug || 'Class')} progress</h1>
          ${table}
        </body>
      </html>
    `
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `${wikiSlug || 'class'}-student-progress-${date}.xls`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const joinUrl = activeLink
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${activeLink.token}`
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
        </nav>
        <p className="mt-7 px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">Assigned classes</p>
        <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
          {wikis.length === 0 ? <p className="px-3 py-3 text-sm leading-5 text-white/40">No classes assigned yet.</p> : wikis.map((wiki) => (
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

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-3 rounded-2xl border border-black/10 bg-[#1A1110]/95 p-1.5 shadow-2xl backdrop-blur lg:hidden">
        <Link href="/home" className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold text-white/55"><Home size={17} />Home</Link>
        <Link href="/teacher" className="flex flex-col items-center gap-1 rounded-xl bg-[#F0523F] py-2 text-[10px] font-bold text-white"><Layout size={17} />Classes</Link>
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
          <p className="text-lg text-[#8B6B65] mt-2">Manage invites and track your students’ progress.</p>
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

        {/* Share link */}
        <div className="rounded-[1.7rem] border border-[#F2E1DD] bg-white shadow-[0_24px_50px_-42px_rgba(226,59,46,0.5)] p-7">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#FDEDEA] flex items-center justify-center text-[#E23B2E]">
                <Link2 size={20} />
              </div>
              <h2 className="text-xl font-bold text-[#1A1110]">Invite link</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#6B4F4A] bg-[#FBF3F1] border border-[#EBD9D5] px-3 py-1.5 rounded-full">
              <Users size={15} className="text-[#B08981]" /> {activeStudents.length} / 35
            </span>
          </div>

          {activeLink ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-[#FBF3F1] border border-[#EBD9D5] rounded-xl px-4 py-3">
                <span className="text-base text-[#6B4F4A] flex-1 truncate font-mono">{joinUrl}</span>
                <button
                  onClick={() => copyLink(activeLink.token)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors ${
                    copied ? 'bg-emerald-500 text-white' : 'bg-[#1A1110] text-white hover:opacity-90'
                  }`}
                >
                  {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => toggleLink(activeLink)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E23B2E] text-white text-[15px] font-bold hover:opacity-90"
                >
                  <Power size={16} /> Turn off link
                </button>
                <button
                  onClick={generateLink}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#EBD9D5] text-[15px] font-semibold text-[#6B4F4A] hover:bg-[#FBF3F1]"
                >
                  <RefreshCw size={16} /> Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-base text-[#8B6B65]">No active link yet. Generate one to share with your students.</p>
              <button
                onClick={generateLink}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] text-white text-[15px] font-bold shadow-lg shadow-[#E23B2E]/25 hover:-translate-y-0.5 transition-transform"
              >
                <Link2 size={17} /> Generate link
              </button>
            </div>
          )}
        </div>

        {/* Students */}
        <div className="rounded-[1.7rem] border border-[#F2E1DD] bg-white shadow-[0_24px_50px_-42px_rgba(226,59,46,0.5)] p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-[#1A1110]">Students &amp; progress</h2>
            <button
              onClick={exportStudentsToExcel}
              disabled={students.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-[#EBD9D5] bg-white px-4 py-2 text-sm font-bold text-[#6B4F4A] transition-colors hover:bg-[#FBF3F1] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Download size={15} /> Export Excel
            </button>
          </div>

          {loading && <p className="text-base text-[#8B6B65]">Loading…</p>}

          {!loading && students.length === 0 && (
            <div className="py-10 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#FDEDEA] flex items-center justify-center text-[#E23B2E]">
                <Users size={26} />
              </div>
              <p className="text-lg font-bold text-[#1A1110] mb-1">No students yet</p>
              <p className="text-base text-[#8B6B65]">Share your invite link to get students enrolled.</p>
            </div>
          )}

          {!loading && students.length > 0 && activeStudents.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#EBD9D5] bg-[#FBF7F5] px-4 py-6 text-center text-base text-[#8B6B65]">
              No active students right now. Past students are listed below.
            </p>
          )}

          {!loading && activeStudents.length > 0 && (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="text-left text-[13px] font-bold uppercase tracking-wide text-[#B08981] border-b-2 border-[#F3E7E4]">
                    <th className="py-3 px-2 w-8">#</th>
                    <th className="py-3 px-2">Student</th>
                    <th className="py-3 px-2">Joined</th>
                    <th className="py-3 px-2">Progress</th>
                    <th className="py-3 px-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudents.map((s, i) => (
                    <tr key={s.enrollmentId} className="border-b border-[#F6EEEC] last:border-0 hover:bg-[#FCF6F5] transition-colors">
                      <td className="py-3.5 px-2 text-[#C6A39C] font-semibold">{i + 1}</td>
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.student.name} email={s.student.email} src={s.student.avatarUrl} size="sm" />
                          <div className="min-w-0">
                            <p className="text-[15px] font-bold text-[#1A1110] truncate">{s.student.name || '—'}</p>
                            <p className="text-sm text-[#8B6B65] truncate">{s.student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-[15px] text-[#8B6B65] whitespace-nowrap">{new Date(s.joinedAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-2">
                        <div className="space-y-2">
                          <ProgressBar progress={s.progress} />
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <Check size={12} /> {s.progress.completed} done
                            </span>
                            <span className="text-xs font-semibold text-[#8B6B65]">
                              {s.progress.total} total
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setSelectedStudent(s)}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[#6B4F4A] hover:text-[#1A1110] transition-colors"
                          >
                            <Eye size={15} /> View progress
                          </button>
                          <button
                            onClick={() => removeStudent(s)}
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[#B08981] hover:text-[#E23B2E] transition-colors"
                          >
                            <Trash2 size={15} /> Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Former students — enrollments revoked by disabling a link, or removed manually */}
          {!loading && formerStudents.length > 0 && (
            <div className="mt-6 border-t border-[#F3E7E4] pt-5">
              <button
                onClick={() => setShowFormer(!showFormer)}
                className="inline-flex items-center gap-2 text-[15px] font-bold text-[#6B4F4A] hover:text-[#1A1110] transition-colors"
              >
                <ChevronLeft size={16} className={`transition-transform ${showFormer ? '-rotate-90' : 'rotate-180'}`} />
                Former students ({formerStudents.length})
              </button>
              <p className="mt-1 text-sm text-[#B08981]">
                Students whose invite link was turned off or who were removed. Their progress is kept.
              </p>

              {showFormer && (
                <div className="overflow-x-auto -mx-2 mt-3">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr className="text-left text-[13px] font-bold uppercase tracking-wide text-[#B08981] border-b-2 border-[#F3E7E4]">
                        <th className="py-3 px-2 w-8">#</th>
                        <th className="py-3 px-2">Student</th>
                        <th className="py-3 px-2">Joined</th>
                        <th className="py-3 px-2">Status</th>
                        <th className="py-3 px-2">Progress</th>
                        <th className="py-3 px-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formerStudents.map((s, i) => (
                        <tr key={s.enrollmentId} className="border-b border-[#F6EEEC] last:border-0 hover:bg-[#FCF6F5] transition-colors opacity-80">
                          <td className="py-3.5 px-2 text-[#C6A39C] font-semibold">{i + 1}</td>
                          <td className="py-3.5 px-2">
                            <div className="flex items-center gap-3">
                              <Avatar name={s.student.name} email={s.student.email} src={s.student.avatarUrl} size="sm" />
                              <div className="min-w-0">
                                <p className="text-[15px] font-bold text-[#1A1110] truncate">{s.student.name || '—'}</p>
                                <p className="text-sm text-[#8B6B65] truncate">{s.student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-[15px] text-[#8B6B65] whitespace-nowrap">{new Date(s.joinedAt).toLocaleDateString()}</td>
                          <td className="py-3.5 px-2 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EBE9] px-2.5 py-1 text-xs font-bold text-[#8B6B65]">
                              <Power size={12} /> {enrollmentStatusLabel(s.status)}
                            </span>
                            {s.removedAt && (
                              <p className="mt-1 text-xs text-[#B08981]">{new Date(s.removedAt).toLocaleDateString()}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-2">
                            <div className="space-y-2">
                              <ProgressBar progress={s.progress} />
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                  <Check size={12} /> {s.progress.completed} done
                                </span>
                                <span className="text-xs font-semibold text-[#8B6B65]">
                                  {s.progress.total} total
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-2 text-right">
                            <button
                              onClick={() => setSelectedStudent(s)}
                              className="inline-flex items-center gap-1 text-sm font-semibold text-[#6B4F4A] hover:text-[#1A1110] transition-colors"
                            >
                              <Eye size={15} /> View progress
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
        </div>
      </main>
      {selectedStudent && (
        <ProgressDialog student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  )
}
