"use client"

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Lexend } from 'next/font/google'
import { Home, Layout, LogOut, GraduationCap, ArrowRight, Check, Pencil, Camera, Loader2, Trash2 } from 'lucide-react'

const display = Lexend({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-lexend' })

type Wiki = {
  slug: string
  displayName: string
  grade: string | null
  picture: string | null
}

type Props = {
  user: { id: string; name: string | null; email: string; role: string; avatarUrl: string | null }
  studentData: { wikis: Wiki[]; progress: Record<string, { total: number; completed: number }> } | null
  teacherData: { wikis: Wiki[]; studentCounts: Record<string, number> } | null
}

function Avatar({ name, email, src, size = 'md' }: { name: string | null; email: string; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase()
  const sizes = { sm: 'w-9 h-9 text-sm', md: 'w-12 h-12 text-lg', lg: 'w-24 h-24 text-4xl' }
  const px = { sm: '36px', md: '48px', lg: '96px' }
  return (
    <div className={`${sizes[size]} relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] flex items-center justify-center font-bold text-white shrink-0 shadow-lg shadow-[#E23B2E]/25`}>
      {src ? <Image src={src} alt={name || email} fill sizes={px[size]} className="object-cover" /> : initials}
    </div>
  )
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const done = total > 0 && completed >= total
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#8B6B65]">{completed} / {total} lessons</span>
        <span className={`text-sm font-bold ${done ? 'text-emerald-600' : 'text-[#E23B2E]'}`}>{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-[#F3E7E4] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#F0523F] to-[#E23B2E]'}`}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
    </div>
  )
}

export default function HomeClient({ user, studentData, teacherData }: Props) {
  const [name, setName] = useState(user.name || '')
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [currentName, setCurrentName] = useState(user.name || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const wikis = studentData?.wikis || teacherData?.wikis || []
  const isTeacher = user.role === 'teacher'

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setAvatarError('Please choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Image must be under 5 MB.'); return }
    setAvatarError(null)
    setAvatarBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/auth/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) setAvatarUrl(data.avatarUrl)
      else setAvatarError(data.error || 'Upload failed.')
    } catch {
      setAvatarError('Upload failed.')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function removeAvatar() {
    setAvatarError(null)
    setAvatarBusy(true)
    try {
      const res = await fetch('/api/auth/avatar', { method: 'DELETE' })
      if (res.ok) setAvatarUrl(null)
      else setAvatarError('Could not remove photo.')
    } catch {
      setAvatarError('Could not remove photo.')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function saveName() {
    if (!name.trim()) return
    setSavingName(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentName(data.user.name || '')
        setEditingName(false)
      }
    } finally {
      setSavingName(false)
    }
  }

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
        <div className="max-w-6xl mx-auto px-5 h-[72px] flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={184} height={64} priority className="h-11 w-auto" />
          </Link>

          <div className="flex items-center gap-1.5">
            <span className="mr-1 hidden sm:block">
              <Avatar name={currentName} email={user.email} src={avatarUrl} size="sm" />
            </span>
            <Link
              href="/home"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white bg-white/10 border border-white/15 text-[15px] font-semibold"
            >
              <Home size={18} />
              <span className="hidden sm:inline">Home</span>
            </Link>

            {isTeacher && (
              <Link
                href="/teacher"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/75 hover:text-white hover:bg-white/10 text-[15px] font-semibold transition-colors"
              >
                <Layout size={18} />
                <span className="hidden sm:inline">My classes</span>
              </Link>
            )}

            <form action="/api/auth/logout" method="post" className="ml-1">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/75 hover:text-white hover:bg-white/10 text-[15px] font-semibold transition-colors">
                <LogOut size={18} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-5 pt-10 pb-16 space-y-10">

        {/* Profile card */}
        <div className="rounded-[2rem] border border-[#F2E1DD] bg-white/90 shadow-[0_30px_70px_-50px_rgba(226,59,46,0.55)] p-7 sm:p-9">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <Avatar name={currentName} email={user.email} src={avatarUrl} size="lg" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarBusy}
                  className="absolute -bottom-1.5 -right-1.5 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#1A1110] text-white shadow-lg transition-colors hover:bg-[#E23B2E] disabled:opacity-60"
                  aria-label={avatarUrl ? 'Change profile picture' : 'Add profile picture'}
                >
                  {avatarBusy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onAvatarSelected}
                />
              </div>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={avatarBusy}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#B08981] hover:text-[#E23B2E] transition-colors disabled:opacity-60"
                >
                  <Trash2 size={12} /> Remove
                </button>
              )}
              {avatarError && <p className="max-w-[9rem] text-center text-xs font-medium text-[#E23B2E]">{avatarError}</p>}
            </div>
            <div className="flex-1 min-w-0 w-full">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDEDEA] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#E23B2E]">
                <GraduationCap size={14} />
                {isTeacher ? 'Teacher' : 'Student'}
              </span>

              {editingName ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveName()}
                    className="text-3xl sm:text-4xl font-extrabold text-[#1A1110] border-b-2 border-[#F0523F] focus:outline-none bg-transparent max-w-full"
                  />
                  <button
                    onClick={saveName}
                    disabled={savingName}
                    className="text-sm px-4 py-2 rounded-xl bg-[#1A1110] text-white font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setName(currentName); setEditingName(false) }}
                    className="text-sm px-4 py-2 rounded-xl border border-[#EBD9D5] text-[#6B4F4A] font-semibold hover:bg-[#FBF3F1]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1A1110]">
                    {currentName || 'Welcome!'}
                  </h1>
                  <button
                    onClick={() => setEditingName(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B08981] hover:text-[#E23B2E] transition-colors"
                  >
                    <Pencil size={14} /> Edit name
                  </button>
                </div>
              )}

              <p className="text-lg text-[#8B6B65] mt-2">{user.email}</p>
              <p className="mt-3 text-base font-medium text-[#6B4F4A]">
                <span className="font-bold text-[#1A1110]">{wikis.length}</span> course{wikis.length !== 1 ? 's' : ''} {isTeacher ? 'assigned' : 'enrolled'}
              </p>
            </div>
          </div>
        </div>

        {/* Courses */}
        <div>
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A1110]">
              {isTeacher ? 'Your wikis' : 'My courses'}
            </h2>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#B08981] pb-1">
              {wikis.length} total
            </span>
          </div>

          {wikis.length === 0 ? (
            <div className="rounded-[2rem] border border-[#F2E1DD] bg-white/80 p-14 text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#FDEDEA] flex items-center justify-center text-[#E23B2E]">
                <GraduationCap size={30} />
              </div>
              <p className="text-xl font-bold text-[#1A1110] mb-1.5">No courses yet</p>
              <p className="text-base text-[#8B6B65] max-w-md mx-auto">
                {isTeacher
                  ? 'Ask the admin to assign wikis to your account.'
                  : 'Ask your teacher for an invite link to join a course.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wikis.map((wiki) => {
                const prog = studentData?.progress[wiki.slug]
                const studentCount = teacherData?.studentCounts[wiki.slug] || 0
                const done = prog && prog.total > 0 && prog.completed >= prog.total

                return (
                  <Link
                    key={wiki.slug}
                    href={`/${wiki.slug}`}
                    className="group flex flex-col rounded-[1.7rem] border border-[#F2E1DD] bg-white shadow-[0_24px_50px_-40px_rgba(226,59,46,0.5)] hover:shadow-[0_30px_60px_-36px_rgba(226,59,46,0.55)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative h-40 bg-gradient-to-br from-[#FDEDEA] to-[#F8D9D3] overflow-hidden">
                      {wiki.picture ? (
                        <Image
                          src={wiki.picture}
                          alt={wiki.displayName}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#E23B2E]/70">
                          <GraduationCap size={44} />
                        </div>
                      )}
                      {done && (
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow">
                          <Check size={13} /> Done
                        </span>
                      )}
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-xl font-bold text-[#1A1110] leading-snug group-hover:text-[#E23B2E] transition-colors">
                        {wiki.displayName}
                      </h3>
                      {wiki.grade && (
                        <p className="text-sm font-medium text-[#B08981] mt-1">{wiki.grade}</p>
                      )}

                      {prog && <ProgressBar completed={prog.completed} total={prog.total} />}

                      {isTeacher && (
                        <p className="mt-3 text-base text-[#6B4F4A]">
                          <span className="font-bold text-[#1A1110]">{studentCount}</span>
                          <span className="text-[#8B6B65]"> / 35 students</span>
                        </p>
                      )}

                      <div className="mt-auto pt-5 flex items-center gap-1.5 text-[15px] font-bold text-[#E23B2E]">
                        {isTeacher ? 'Open wiki' : (prog && prog.completed > 0 ? 'Continue' : 'Start learning')}
                        <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
