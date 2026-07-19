"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type RosterStudent = { id: string; name: string | null; avatarUrl: string | null }

type LinkInfo = {
  wikiSlug: string
  className: string | null
  teacher: { name: string | null; email: string }
  isActive: boolean
  status: 'active' | 'scheduled' | 'ended' | 'off'
  closedMessage: string | null
  startsAt: string | null
  endsAt: string | null
  spotsLeft: number
  students: RosterStudent[]
}

function initialsOf(student: RosterStudent) {
  const n = (student.name || '').trim()
  if (!n) return '?'
  return n.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function JoinPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [info, setInfo] = useState<LinkInfo | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [autoJoining, setAutoJoining] = useState(false)
  // "Pick your name" sign-in for students the teacher already added.
  const [picked, setPicked] = useState<RosterStudent | null>(null)
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)

  async function signInAsPicked(e: React.FormEvent) {
    e.preventDefault()
    if (!picked || !password || signingIn) return
    setSigningIn(true)
    setSignInError(null)
    try {
      const res = await fetch(`/api/join/${params.token}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: picked.id, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sign in failed')
      router.push(`/${data.wikiSlug}`)
    } catch (err: any) {
      setSignInError(err.message)
      setSigningIn(false)
    }
  }
  // Refs, not state: state updates are async, so a double-click or a
  // re-run of the effect (React StrictMode) could fire the POST twice
  // before the disabled/joining state catches up.
  const joinInFlight = useRef(false)
  const autoJoinAttempted = useRef(false)

  const doJoin = useCallback(async (auto = false) => {
    if (joinInFlight.current) return
    joinInFlight.current = true
    if (auto) setAutoJoining(true)
    else setJoining(true)
    setJoinError(null)
    try {
      const res = await fetch(`/api/join/${params.token}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=/join/${params.token}`)
          return
        }
        throw new Error(data.error || 'Failed to join')
      }
      router.push(`/${data.wikiSlug}`)
    } catch (e: any) {
      setJoinError(e.message)
      setAutoJoining(false)
    } finally {
      joinInFlight.current = false
      setJoining(false)
    }
  }, [params.token, router])

  useEffect(() => {
    // Load link info and check if user is already logged in simultaneously
    Promise.all([
      fetch(`/api/join/${params.token}`).then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ]).then(([linkData, meData]) => {
      if (linkData.error) {
        setInfoError(linkData.error)
        return
      }
      setInfo(linkData)

      // If the user is already signed in as a student, auto-join immediately
      // (once — the effect re-runs under StrictMode)
      if (meData?.user?.role === 'student' && linkData.isActive && linkData.spotsLeft > 0 && !autoJoinAttempted.current) {
        autoJoinAttempted.current = true
        doJoin(true)
      }
    }).catch(() => setInfoError('Failed to load link info'))
  }, [params.token, doJoin])

  if (autoJoining) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center space-y-4">
          <Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={160} height={56} className="mx-auto h-10 w-auto" />
          <p className="text-sm text-gray-500">Enrolling you in the course…</p>
          <div className="flex justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (infoError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900 mb-2">Link not found</p>
          <p className="text-sm text-gray-500">{infoError}</p>
        </div>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    )
  }

  if (!info.isActive) {
    const heading =
      info.status === 'ended' ? 'This class has ended'
      : info.status === 'scheduled' ? 'This class hasn’t started yet'
      : 'This link is closed'
    const detail =
      info.status === 'ended'
        ? `${info.className || 'The class'} finished${info.endsAt ? ` on ${new Date(info.endsAt).toLocaleDateString()}` : ''}. Ask your teacher if you still need access.`
        : info.status === 'scheduled'
          ? `It opens${info.startsAt ? ` on ${new Date(info.startsAt).toLocaleDateString()}` : ' soon'}. Come back then to join.`
          : info.closedMessage || 'The teacher has disabled access to this course.'
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-sm text-center">
          <p className="text-lg font-medium text-gray-900 mb-2">{heading}</p>
          <p className="text-sm text-gray-500">{detail}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
        <div className="mb-6">
          <Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={160} height={56} className="mx-auto h-10 w-auto mb-6" />
          <p className="text-sm text-gray-500 mb-1">You&apos;ve been invited to join</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 capitalize">
            {info.className || info.wikiSlug.replace(/-/g, ' ')}
          </h1>
          {info.className && (
            <p className="text-sm text-gray-500 capitalize">{info.wikiSlug.replace(/-/g, ' ')}</p>
          )}
          <p className="text-sm text-gray-500">
            Teacher: {info.teacher.name || info.teacher.email}
          </p>
          {info.spotsLeft <= 5 && (
            <p className="text-xs text-amber-600 mt-2">
              {info.spotsLeft} spot{info.spotsLeft !== 1 ? 's' : ''} left
            </p>
          )}
        </div>

        {/* Students the teacher already added: pick your name, type only a password. */}
        {info.students.length > 0 && (
          <div className="mb-6 text-left">
            {picked ? (
              <form onSubmit={signInAsPicked}>
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-sm font-bold text-white">
                    {picked.avatarUrl
                      ? <Image src={picked.avatarUrl} alt="" width={36} height={36} className="h-9 w-9 object-cover" />
                      : initialsOf(picked)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                    {picked.name || 'Unnamed student'}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setPicked(null); setPassword(''); setSignInError(null) }}
                    className="shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Not you?
                  </button>
                </div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Your password</label>
                <input
                  type="password" autoFocus required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary"
                  placeholder="Enter your password"
                />
                {signInError && <p className="mt-2 text-sm text-red-600" role="alert">{signInError}</p>}
                <button
                  type="submit" disabled={!password || signingIn}
                  className="mt-3 w-full rounded-lg bg-primary py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {signingIn ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            ) : (
              <>
                <p className="mb-1 text-sm font-semibold text-gray-900">Already added by your teacher?</p>
                <p className="mb-3 text-xs text-gray-500">Find your name, then just enter your password.</p>
                <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
                  {info.students.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => { setPicked(s); setSignInError(null) }}
                        className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-gray-50"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-sm font-bold text-white">
                          {s.avatarUrl
                            ? <Image src={s.avatarUrl} alt="" width={36} height={36} className="h-9 w-9 object-cover" />
                            : initialsOf(s)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                          {s.name || 'Unnamed student'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">or</span>
                  <span className="h-px flex-1 bg-gray-200" />
                </div>
              </>
            )}
          </div>
        )}

        {joinError && (
          <p className="text-sm text-red-600 mb-4" role="alert">{joinError}</p>
        )}

        {!picked && (
          <>
            <button
              onClick={() => doJoin(false)}
              disabled={joining || info.spotsLeft === 0}
              className="w-full py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50"
            >
              {joining ? 'Joining…' : info.spotsLeft === 0 ? 'Class is full' : 'Join course'}
            </button>

            <p className="text-xs text-gray-400 mt-4">
              You&apos;ll need to sign in or create an account to continue.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
