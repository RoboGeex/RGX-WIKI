"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Home, Layout, LogOut } from 'lucide-react'

type Wiki = {
  slug: string
  displayName: string
  grade: string | null
  picture: string | null
}

type Props = {
  user: { id: string; name: string | null; email: string; role: string }
  studentData: { wikis: Wiki[]; progress: Record<string, { total: number; completed: number }> } | null
  teacherData: { wikis: Wiki[]; studentCounts: Record<string, number> } | null
}

function Avatar({ name, email, size = 'md' }: { name: string | null; email: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase()
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-base', lg: 'w-20 h-20 text-2xl' }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center font-bold text-white shrink-0`}>
      {initials}
    </div>
  )
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{completed} / {total} lessons</span>
        <span className="text-xs font-semibold text-gray-700">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
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

  const wikis = studentData?.wikis || teacherData?.wikis || []

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
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-[#1e1e1e] w-full border-b border-transparent fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2">
            <Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={184} height={64} priority className="h-12 w-auto" />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Link
              href="/home"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-primary bg-primary/10 border border-primary/20 transition-colors"
            >
              <Home size={16} />
              <span className="text-sm font-medium">Home</span>
            </Link>

            {user.role === 'teacher' && (
              <Link
                href="/teacher"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Layout size={16} />
                <span className="text-sm font-medium">My classes</span>
              </Link>
            )}

            {/* Avatar + name */}
            <div className="flex items-center gap-2 px-3 py-2">
              <Avatar name={currentName} email={user.email} size="sm" />
              <span className="text-sm text-white/70 hidden sm:block">{currentName || user.email}</span>
            </div>

            <form action="/api/auth/logout" method="post">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                <LogOut size={16} />
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-8 space-y-8">

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-5">
            <Avatar name={currentName} email={user.email} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveName()}
                      className="text-xl font-bold text-gray-900 border-b-2 border-primary focus:outline-none bg-transparent"
                    />
                    <button
                      onClick={saveName}
                      disabled={savingName}
                      className="text-xs px-3 py-1 rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
                    >
                      {savingName ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setName(currentName); setEditingName(false) }}
                      className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-bold text-gray-900">
                      {currentName || 'No name set'}
                    </h1>
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-xs text-gray-400 hover:text-gray-700 underline"
                    >
                      Edit name
                    </button>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.role === 'teacher'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {user.role === 'teacher' ? 'Teacher' : 'Student'}
                </span>
                <span className="text-xs text-gray-400">{wikis.length} course{wikis.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Courses */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {user.role === 'teacher' ? 'Your Wikis' : 'My courses'}
          </h2>

          {wikis.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-gray-500 font-medium mb-1">No courses yet</p>
              <p className="text-sm text-gray-400">
                {user.role === 'teacher'
                  ? 'Ask the admin to assign wikis to your account.'
                  : 'Ask your teacher for an invite link to join a course.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {wikis.map((wiki) => {
                const prog = studentData?.progress[wiki.slug]
                const studentCount = teacherData?.studentCounts[wiki.slug] || 0

                return (
                  <Link
                    key={wiki.slug}
                    href={`/${wiki.slug}`}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all overflow-hidden"
                  >
                    {/* Cover */}
                    <div className="relative h-36 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      {wiki.picture ? (
                        <Image
                          src={wiki.picture}
                          alt={wiki.displayName}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">📚</div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors leading-snug">
                        {wiki.displayName}
                      </h3>
                      {wiki.grade && (
                        <p className="text-xs text-gray-400 mt-0.5">{wiki.grade}</p>
                      )}

                      {/* Student: progress bar */}
                      {prog && (
                        <ProgressBar completed={prog.completed} total={prog.total} />
                      )}

                      {/* Teacher: student count */}
                      {user.role === 'teacher' && (
                        <p className="mt-2 text-xs text-gray-500">
                          <span className="font-medium text-gray-700">{studentCount}</span> / 35 students enrolled
                        </p>
                      )}
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
