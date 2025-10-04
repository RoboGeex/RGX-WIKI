"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { t, type Locale } from '@/lib/i18n'
import { setStoredLocale } from '@/lib/unlock'

export default function UnlockPage({ params }: { params: { locale: Locale } }) {
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const kit = searchParams.get('kit')
  const redirect = searchParams.get('redirect')
  const locale = params.locale

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

      router.push(redirect)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">{t('unlockWiki', locale)}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('enterAccessCodeToContinue', locale)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium mb-2">
                {t('accessCode', locale)}
              </label>
              <input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 backdrop-blur focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t('accessCodePlaceholder', locale)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={isLoading || !accessCode.trim()}
              className="w-full bg-primary text-primary-foreground font-medium py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition hover:opacity-90"
            >
              {isLoading ? t('unlocking', locale) : t('continue', locale)}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
