"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { t, type Locale } from '@/lib/i18n'
import { setStoredLocale, setUnlocked } from '@/lib/unlock'

export default function UnlockPage({ params }: { params: { locale: Locale } }) {
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const kit = searchParams.get('kit')
  const redirect = searchParams.get('redirect')
  const locale = params.locale

  const kitDisplayNames: Record<string, string> = {
    ziggy: 'Ziggy Learning Kit',
    clicky: 'Clicky Learning Kit',
    'student-kit': 'Student Kit',
  }
  const kitName = kit ? kitDisplayNames[kit] || kit.replace(/-/g, ' ') : ''

  useEffect(() => {
    if (locale) {
      setStoredLocale(locale)
    }
  }, [locale])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accessCode.trim() || !kit || !redirect) {
      setError(t('missingKitOrRedirect', locale))
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode, kitSlug: kit }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('invalidAccessCode', locale))
      }

      setUnlocked(true)
      window.location.href = redirect
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#eef2f1] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-xl space-y-6 px-8 py-10">
          <div className="flex flex-col items-center gap-4">
            <img
              src="/images/robogeex-logo-wordmark.png"
              alt="RoboGeex Academy"
              className="h-16 w-auto drop-shadow-sm"
            />
            {kitName ? (
              <span className="text-xs uppercase tracking-[0.45em] text-primary/80">{kitName}</span>
            ) : null}
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold text-gray-900">{t('unlockWiki', locale)}</h1>
            <p className="text-sm text-gray-600">
              {t('enterAccessCodeToContinue', locale)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
                {t('accessCode', locale)}
              </label>
              <input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                placeholder={t('accessCodePlaceholder', locale)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !accessCode.trim()}
              className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:-translate-y-[1px] shadow-md shadow-primary/30"
            >
              {isLoading ? t('unlocking', locale) : t('continue', locale)}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
