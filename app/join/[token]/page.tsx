"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type LinkInfo = {
  wikiSlug: string
  teacher: { name: string | null; email: string }
  isActive: boolean
  spotsLeft: number
}

export default function JoinPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [info, setInfo] = useState<LinkInfo | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [autoJoining, setAutoJoining] = useState(false)

  const doJoin = useCallback(async (auto = false) => {
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
      if (meData?.user?.role === 'student' && linkData.isActive && linkData.spotsLeft > 0) {
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
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900 mb-2">This link is closed</p>
          <p className="text-sm text-gray-500">The teacher has disabled access to this course.</p>
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
            {info.wikiSlug.replace(/-/g, ' ')}
          </h1>
          <p className="text-sm text-gray-500">
            Teacher: {info.teacher.name || info.teacher.email}
          </p>
          {info.spotsLeft <= 5 && (
            <p className="text-xs text-amber-600 mt-2">
              {info.spotsLeft} spot{info.spotsLeft !== 1 ? 's' : ''} left
            </p>
          )}
        </div>

        {joinError && (
          <p className="text-sm text-red-600 mb-4" role="alert">{joinError}</p>
        )}

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
      </div>
    </div>
  )
}
