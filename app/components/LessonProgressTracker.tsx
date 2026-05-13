"use client"

import { useEffect, useState } from 'react'

type Props = {
  lessonId: string
  wikiSlug: string
}

export default function LessonProgressTracker({ lessonId, wikiSlug }: Props) {
  const [status, setStatus] = useState<'idle' | 'completed' | 'saving'>('idle')

  // Mark as in_progress on mount
  useEffect(() => {
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, wikiSlug, status: 'in_progress' }),
    }).catch(() => {}) // silent — progress tracking shouldn't break the page
  }, [lessonId, wikiSlug])

  async function markComplete() {
    setStatus('saving')
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, wikiSlug, status: 'completed' }),
      })
      setStatus('completed')
    } catch {
      setStatus('idle')
    }
  }

  if (status === 'completed') {
    return (
      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium py-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Lesson marked as complete
      </div>
    )
  }

  return (
    <button
      onClick={markComplete}
      disabled={status === 'saving'}
      className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2 disabled:opacity-50"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {status === 'saving' ? 'Saving…' : 'Mark as complete'}
    </button>
  )
}
