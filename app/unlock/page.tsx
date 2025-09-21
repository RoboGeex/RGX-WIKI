"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setUnlocked, getStoredLocale } from '@/lib/unlock'

export default function UnlockPage() {
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accessCode.trim()) return
    setIsLoading(true)
    try {
      setUnlocked(true)
      const locale = getStoredLocale()
      router.push(`/${locale}/student-kit/lesson/getting-started`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">Unlock Your Kit Wiki</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter the access code provided with your kit to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium mb-2">
                Access code
              </label>
              <input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 backdrop-blur focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your access code"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !accessCode.trim()}
              className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition hover:opacity-90"
            >
              {isLoading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
