"use client"

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams?.get('redirect') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')

      const role = data.user?.role

      // Editors: persist developer ID in localStorage so EditorAuthGate passes
      if (role === 'editor' && data.developerId) {
        localStorage.setItem('rgx.devId', String(data.developerId))
      }

      // Route to the right destination.
      // Block non-editors from /editor redirects, and block editors/admins from /home redirects.
      const isEditorRole = role === 'editor' || role === 'admin'
      const safeRedirect =
        redirectParam &&
        !(redirectParam.startsWith('/editor') && !isEditorRole) &&
        !(redirectParam === '/home' && isEditorRole)
          ? redirectParam
          : null

      let dest: string
      if (safeRedirect) {
        dest = safeRedirect
      } else if (role === 'admin') {
        dest = '/dashboard'
      } else if (role === 'editor') {
        dest = '/dashboard'   // developers go to the dashboard, not /editor
      } else {
        dest = '/home'
      }

      // Full page navigation so cookies are included in the very next request
      window.location.href = dest
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">

        <div className="flex justify-center mb-6">
          <Image src="/images/robogeex-logo.png" alt="RoboGeex Academy" width={180} height={64} className="h-12 w-auto" />
        </div>

        <h1 className="text-2xl font-bold mb-1 text-gray-900 text-center">Sign in</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Welcome back to RoboGeex Wiki.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Don&apos;t have an account?{' '}
          <Link
            href={`/signup${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`}
            className="text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
