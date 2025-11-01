"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { t, type Locale } from '@/lib/i18n'
import { setStoredLocale, setUnlocked } from '@/lib/unlock'

export default function UnlockPage({ params }: { params: { locale: Locale } }) {
  const [accessCode, setAccessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [feedback, setFeedback] = useState<{ status: 'idle' | 'error' | 'success'; message: string | null }>({
    status: 'idle',
    message: null,
  })
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

  const feedbackId = 'access-code-feedback'
  const describedBy = useMemo(() => {
    if (feedback.status !== 'idle' && feedback.message) {
      return feedbackId
    }
    return undefined
  }, [feedback.status, feedback.message])

  const inputBorderClasses =
    feedback.status === 'error'
      ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
      : feedback.status === 'success'
        ? 'border-emerald-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
        : 'border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/20'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accessCode.trim() || !kit || !redirect) {
      setFeedback({ status: 'error', message: t('missingKitOrRedirect', locale) })
      return
    }
    setIsLoading(true)
    setFeedback({ status: 'idle', message: null })
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
      setFeedback({ status: 'success', message: t('accessCodeSuccess', locale) })
      setTimeout(() => {
        window.location.href = redirect
      }, 650)
    } catch (err: any) {
      setFeedback({ status: 'error', message: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-[#eef2f1] flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">
          <div
            className="rounded-[32px] border border-white/70 bg-white/90 ring-1 ring-black/5 backdrop-blur-2xl shadow-2xl shadow-zinc-900/10 px-10 py-12 space-y-8 md:space-y-10"
            style={{ opacity: 0, transform: 'translateY(16px)', animation: 'fadeInUp 0.6s ease-out forwards' }}
          >
            <div className="flex flex-col items-center gap-5 text-center">
              <img
                src="/images/robogeex-logo-wordmark.png"
                alt="RoboGeex Academy"
                className="h-16 w-auto drop-shadow-sm"
              />
              {kitName ? (
                <span className="text-[0.7rem] uppercase tracking-[0.65em] text-primary/70 font-semibold">
                  {kitName}
                </span>
              ) : null}
              <h1 className="text-3xl md:text-[2rem] font-semibold text-gray-900">{t('unlockWiki', locale)}</h1>
            </div>

            <p className="text-left text-sm md:text-base text-gray-700 leading-relaxed">
              {t('enterAccessCodeToContinue', locale)}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6 text-left" noValidate>
              <div className="space-y-2">
                <label htmlFor="accessCode" className="block text-sm font-semibold text-gray-800">
                  {t('accessCode', locale)}
                </label>
                <div className="relative">
                  <input
                    id="accessCode"
                    type={showCode ? 'text' : 'password'}
                    autoComplete="one-time-code"
                    inputMode="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl bg-slate-50 shadow-md focus:outline-none transition-all ${inputBorderClasses}`}
                    placeholder={t('accessCodePlaceholder', locale)}
                    aria-describedby={describedBy}
                    aria-invalid={feedback.status === 'error'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode((prev) => !prev)}
                    className="absolute inset-y-1 right-1 flex items-center rounded-xl px-3 text-xs font-semibold uppercase tracking-wider text-primary/80 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition"
                    aria-pressed={showCode}
                  >
                    {t(showCode ? 'hideCode' : 'showCode', locale)}
                  </button>
                </div>
              </div>

              <div
                id={feedbackId}
                role="status"
                aria-live="polite"
                className={`min-h-[1.25rem] text-sm ${
                  feedback.status === 'error'
                    ? 'text-red-600'
                    : feedback.status === 'success'
                      ? 'text-emerald-600'
                      : 'text-gray-500'
                }`}
              >
                {feedback.message}
              </div>

              <button
                type="submit"
                disabled={isLoading || !accessCode.trim()}
                className="w-full bg-[#f05d4e] text-white font-semibold py-3.5 px-4 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 hover:-translate-y-[1px] hover:shadow-lg hover:shadow-[#f05d4e]/40 active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#f05d4e]"
                aria-busy={isLoading}
              >
                {isLoading ? t('unlocking', locale) : t('continue', locale)}
              </button>

              <div className="pt-2 text-sm text-gray-500">
                {t('dontHaveCode', locale)}{' '}
                <a
                  href="mailto:info@robogeex.com"
                  className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md"
                >
                  {t('contactUs', locale)}
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
    </>
  )
}
