"use client"

import { useEffect, useRef, useState } from 'react'

type Props = {
  lessonId: string
  wikiSlug: string
  initialStatus?: 'idle' | 'completed'
  /** Seconds already recorded for this lesson (so the timer resumes, not restarts). */
  initialTimeSpentSec?: number
  /** Only students have their time tracked. */
  trackTime?: boolean
}

// How often accumulated seconds are pushed to the server.
const FLUSH_INTERVAL_MS = 30_000
// Stop counting after this long with no interaction, so a lesson left open in a
// visible window overnight doesn't record eight hours of "study time".
const IDLE_AFTER_MS = 120_000

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`
  return `${sec}s`
}

export default function LessonProgressTracker({
  lessonId,
  wikiSlug,
  initialStatus = 'idle',
  initialTimeSpentSec = 0,
  trackTime = false,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'completed' | 'saving'>(initialStatus)
  const [elapsed, setElapsed] = useState(initialTimeSpentSec)
  const [counting, setCounting] = useState(false)

  // Mark as in_progress on mount
  useEffect(() => {
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, wikiSlug, status: 'in_progress' }),
    }).catch(() => {}) // silent — progress tracking shouldn't break the page
  }, [lessonId, wikiSlug])

  // Active-time timer. Counts a second only while the tab is visible, the
  // window is focused, and the student has interacted recently — so closing
  // the browser or switching tabs stops the clock. It also stops for good once
  // the lesson is complete: the number is "how long it took to finish", so
  // re-reading a finished lesson must not keep inflating it.
  const isCompleted = status === 'completed'
  // Stop the clock the instant "Mark as complete" is clicked ('saving'), not
  // when the round-trip returns — otherwise the seconds spent waiting on the
  // network would show in the UI but be rejected by the server (which no longer
  // accepts time for a completed lesson), leaving display and stored value out
  // of step. If saving fails, status returns to 'idle' and the timer resumes.
  const timerRunning = status === 'idle'
  const unsentRef = useRef(0)
  // Lets markComplete() bank pending seconds *before* the lesson flips to
  // completed, so the last partial interval isn't lost.
  const flushRef = useRef<() => Promise<void>>(async () => {})
  useEffect(() => {
    if (!trackTime || !timerRunning) return

    let lastActivity = Date.now()
    const bump = () => { lastActivity = Date.now() }
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel']
    activityEvents.forEach((e) => window.addEventListener(e, bump, { passive: true }))

    const isActive = () =>
      document.visibilityState === 'visible' &&
      document.hasFocus() &&
      Date.now() - lastActivity < IDLE_AFTER_MS

    const tick = window.setInterval(() => {
      const active = isActive()
      setCounting(active)
      if (active) {
        unsentRef.current += 1
        setElapsed((v) => v + 1)
      }
    }, 1000)

    const flush = async (useBeacon = false) => {
      const seconds = unsentRef.current
      if (seconds <= 0) return
      unsentRef.current = 0
      const payload = JSON.stringify({ lessonId, wikiSlug, seconds })
      // On unload only sendBeacon is guaranteed to survive the navigation.
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/progress/time', new Blob([payload], { type: 'application/json' }))
        return
      }
      await fetch('/api/progress/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }
    // Awaited by markComplete() so the time lands before the lesson is closed out.
    flushRef.current = () => flush(false)

    const flushTimer = window.setInterval(() => { void flush(false) }, FLUSH_INTERVAL_MS)
    // Tab hidden / browser closing → bank the time immediately.
    const onVisibility = () => { if (document.visibilityState === 'hidden') void flush(true) }
    const onPageHide = () => { void flush(true) }
    const onBlur = () => { void flush(false) }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('blur', onBlur)

    return () => {
      void flush(true) // navigating to another lesson also banks the time
      flushRef.current = async () => {}
      window.clearInterval(tick)
      window.clearInterval(flushTimer)
      setCounting(false)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('blur', onBlur)
      activityEvents.forEach((e) => window.removeEventListener(e, bump))
    }
  }, [lessonId, wikiSlug, trackTime, timerRunning])

  async function markComplete() {
    // Bank the seconds accrued so far first — once the lesson is completed the
    // timer stops and the server stops accepting time for it.
    await flushRef.current().catch(() => {})
    setStatus('saving')
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, wikiSlug, status: 'completed' }),
      })
      if (!response.ok) throw new Error('Progress could not be saved')
      setStatus('completed')
    } catch {
      setStatus('idle')
    }
  }

  const timer = trackTime ? (
    <span
      className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 tabular-nums"
      title={
        isCompleted
          ? 'Total active time you spent finishing this lesson'
          : counting
            ? 'Timing your active work on this lesson'
            : 'Paused — the timer runs only while this tab is open and in use'
      }
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {isCompleted ? `Took ${formatDuration(elapsed)}` : formatDuration(elapsed)}
      {!isCompleted && !counting && <span className="text-xs">(paused)</span>}
    </span>
  ) : null

  if (status === 'completed') {
    return (
      <div className="flex flex-wrap items-center gap-4 py-2">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Lesson marked as complete
        </div>
        {timer}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-4 py-2">
      <button
        onClick={markComplete}
        disabled={status === 'saving'}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {status === 'saving' ? 'Saving…' : 'Mark as complete'}
      </button>
      {timer}
    </div>
  )
}
