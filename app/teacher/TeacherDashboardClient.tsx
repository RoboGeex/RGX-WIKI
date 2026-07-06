"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Lexend } from 'next/font/google'
import { Home, Layout, LogOut, ChevronLeft, Link2, Copy, Check, Power, RefreshCw, Users, Trash2 } from 'lucide-react'

const display = Lexend({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-lexend' })

function Avatar({ name, email, size = 'sm' }: { name: string | null; email: string; size?: 'sm' | 'md' }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase()
  const sizes = { sm: 'w-9 h-9 text-sm', md: 'w-11 h-11 text-base' }
  return (
    <div className={`${sizes[size]} rounded-xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] flex items-center justify-center font-bold text-white shrink-0`}>
      {initials}
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
  student: { id: string; email: string; name: string | null }
  link: { id: string; isActive: boolean }
  progress: { completed: number; in_progress: number }
}

type Props = {
  wikis: Wiki[]
  user: { name: string | null; email: string }
}

export default function TeacherDashboardClient({ wikis, user }: Props) {
  const [wikiSlug, setWikiSlug] = useState(wikis[0]?.slug || '')
  const [links, setLinks] = useState<LinkInfo[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const activeLink = links.find((l) => l.isActive) || null

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
    if (disable && !confirm('Turning this link off will revoke access for ALL students enrolled through it. Continue?')) return
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

  const joinUrl = activeLink
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${activeLink.token}`
    : null

  const displayName = user.name || user.email

  return (
    <div
      className={`${display.variable} rgx-dash min-h-screen text-[#1A1110]`}
      style={{
        background:
          'radial-gradient(circle at 12% 0%, rgba(240,82,63,0.10), transparent 40%), radial-gradient(circle at 90% 5%, rgba(240,82,63,0.08), transparent 38%), linear-gradient(180deg, #FDF6F4 0%, #FBF7F5 40%, #FBF6F4 100%)',
      }}
    >
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[#1A1110]/95 backdrop-blur border-b border-black/20">
        <div className="max-w-5xl mx-auto px-5 h-[72px] flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={184} height={64} priority className="h-11 w-auto" />
          </Link>

          <div className="flex items-center gap-1.5">
            <Link href="/home" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/75 hover:text-white hover:bg-white/10 text-[15px] font-semibold transition-colors">
              <Home size={18} />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link href="/teacher" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white bg-white/10 border border-white/15 text-[15px] font-semibold">
              <Layout size={18} />
              <span className="hidden sm:inline">My classes</span>
            </Link>
            <form action="/api/auth/logout" method="post" className="ml-1">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/75 hover:text-white hover:bg-white/10 text-[15px] font-semibold transition-colors">
                <LogOut size={18} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-5 pt-10 pb-16 space-y-8">

        {/* Header */}
        <div>
          <Link href="/home" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B08981] hover:text-[#E23B2E] transition-colors mb-3">
            <ChevronLeft size={16} /> Back to home
          </Link>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1A1110]">My classes</h1>
          <p className="text-lg text-[#8B6B65] mt-2">Manage invites and track your students’ progress.</p>
        </div>

        {/* Course tabs */}
        <div className="flex flex-wrap items-center gap-2.5">
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
              <Users size={15} className="text-[#B08981]" /> {students.length} / 35
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
          <h2 className="text-xl font-bold text-[#1A1110] mb-5">Students &amp; progress</h2>

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

          {!loading && students.length > 0 && (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full min-w-[620px]">
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
                  {students.map((s, i) => (
                    <tr key={s.enrollmentId} className="border-b border-[#F6EEEC] last:border-0 hover:bg-[#FCF6F5] transition-colors">
                      <td className="py-3.5 px-2 text-[#C6A39C] font-semibold">{i + 1}</td>
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.student.name} email={s.student.email} size="sm" />
                          <div className="min-w-0">
                            <p className="text-[15px] font-bold text-[#1A1110] truncate">{s.student.name || '—'}</p>
                            <p className="text-sm text-[#8B6B65] truncate">{s.student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-[15px] text-[#8B6B65] whitespace-nowrap">{new Date(s.joinedAt).toLocaleDateString()}</td>
                      <td className="py-3.5 px-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">
                            <Check size={13} /> {s.progress.completed} done
                          </span>
                          {s.progress.in_progress > 0 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-700">
                              {s.progress.in_progress} in progress
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <button
                          onClick={() => removeStudent(s)}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-[#B08981] hover:text-[#E23B2E] transition-colors"
                        >
                          <Trash2 size={15} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
