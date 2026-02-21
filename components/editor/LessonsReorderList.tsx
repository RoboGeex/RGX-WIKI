"use client"

import { useEffect, useState, useRef, type DragEvent } from "react"
import Link from "next/link"
import { applyDeveloperHeader } from "./dev-identity"

const ENABLE_SEGMENTS_EDITOR = false

type LessonSummary = {
  id?: string
  slug: string
  title_en?: string
  title_ar?: string
  duration_min?: number
  difficulty?: string
  order?: number
  ownerId?: string
  status?: string
}
type Props = {
  wikiSlug: string
  kitSlug: string
  defaultLocale: string
  lessons: LessonSummary[]
  viewBaseUrl?: string
}

function assignSequentialOrder(list: LessonSummary[]): LessonSummary[] {
  return list.map((lesson, idx) => ({ ...lesson, order: idx + 1 }))
}

function normalizeLessons(list: LessonSummary[]): LessonSummary[] {
  const sorted = list
    .slice()
    .sort((a, b) => {
      const orderDiff = (a.order ?? 0) - (b.order ?? 0)
      if (orderDiff !== 0) return orderDiff
      return a.slug.localeCompare(b.slug)
    })
  return assignSequentialOrder(sorted)
}

function reorderToIndex(list: LessonSummary[], slug: string, targetIndex: number): LessonSummary[] {
  const next = list.map((lesson) => ({ ...lesson }))
  const fromIndex = next.findIndex((lesson) => lesson.slug === slug)
  if (fromIndex === -1) {
    return list
  }

  let target = targetIndex
  if (target < 0) target = 0
  if (target > next.length) target = next.length

  const [moved] = next.splice(fromIndex, 1)

  if (fromIndex < target) target -= 1

  next.splice(target, 0, moved)

  return assignSequentialOrder(next)
}

function ordersMatch(a: LessonSummary[], b: LessonSummary[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.slug !== b[i]?.slug) return false
  }
  return true
}

export default function LessonsReorderList({ wikiSlug, kitSlug, defaultLocale, lessons, viewBaseUrl }: Props) {
  const [items, setItems] = useState(() => normalizeLessons(lessons))
  const [draggingSlug, setDraggingSlug] = useState<string | null>(null)
  const [indicator, setIndicator] = useState<{ slug: string | null; position: "before" | "after" | "end" } | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [currentDev, setCurrentDev] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState<string | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const dragImageRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setItems(normalizeLessons(lessons))
  }, [lessons])

  useEffect(() => {
    const headers = applyDeveloperHeader({})
    fetch('/api/developers/me', { headers })
      .then(res => res.json())
      .then(data => {
        if (data.ok) setCurrentDev(data.developer)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(null), 2500)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(null), 4000)
    return () => window.clearTimeout(timer)
  }, [error])

  // Cleanup drag image on unmount
  useEffect(() => {
    return () => {
      if (dragImageRef.current && document.body.contains(dragImageRef.current)) {
        document.body.removeChild(dragImageRef.current)
      }
    }
  }, [])

  const resetDragState = () => {
    setDraggingSlug(null)
    setIndicator(null)
    setIsDragging(false)
    setDragOffset({ x: 0, y: 0 })
    
    // Clean up drag image
    if (dragImageRef.current && document.body.contains(dragImageRef.current)) {
      document.body.removeChild(dragImageRef.current)
      dragImageRef.current = null
    }
  }

  const persistOrder = (nextOrder: LessonSummary[], previousOrder: LessonSummary[]) => {
    setSaving(true)
    setStatus(null)
    setError(null)
    const sequence = nextOrder.map((lesson) => lesson.slug)
    
    const headers = applyDeveloperHeader({ "Content-Type": "application/json" })

    fetch("/api/lessons/reorder", {
      method: "POST",
      headers,
      body: JSON.stringify({ wikiSlug, kitSlug, sequence }),
    })
      .then(async (res) => {
        if (!res.ok) {
          let message = "Failed to update order"
          try {
            const data = await res.json()
            if (data?.error) message = data.error
          } catch {}
          throw new Error(message)
        }
        const result = await res.json()
        if (result.ok) {
          setStatus("Lesson order updated successfully")
        } else {
          throw new Error(result.error || "Unknown error occurred")
        }
      })
      .catch((err: any) => {
        console.error("Reorder error:", err)
        // Revert to previous order on error
        setItems(previousOrder)
        setError(err?.message || "Unable to update order")
      })
      .finally(() => {
        setSaving(false)
      })
  }

  const handleDragStart = (slug: string) => (event: DragEvent<HTMLButtonElement>) => {
    if (saving) {
      event.preventDefault()
      return
    }
    
    const dragElement = event.currentTarget.closest('[data-lesson-item]') as HTMLElement
    if (!dragElement) return
    
    // Calculate drag offset for smooth positioning
    const rect = dragElement.getBoundingClientRect()
    
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    })
    
    setDraggingSlug(slug)
    setIsDragging(true)
    setIndicator({ slug, position: "before" })
    event.dataTransfer.effectAllowed = "move"
    
    // Create a smooth drag image
    try {
      const dragImage = dragElement.cloneNode(true) as HTMLElement
      dragImage.style.transform = 'rotate(2deg) scale(1.02)'
      dragImage.style.opacity = '0.95'
      dragImage.style.border = '2px solid #3b82f6'
      dragImage.style.borderRadius = '12px'
      dragImage.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.2)'
      dragImage.style.width = rect.width + 'px'
      dragImage.style.height = rect.height + 'px'
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-2000px'
      dragImage.style.left = '-2000px'
      dragImage.style.pointerEvents = 'none'
      dragImage.style.zIndex = '9999'
      dragImage.style.transition = 'none'
      
      document.body.appendChild(dragImage)
      dragImageRef.current = dragImage as HTMLDivElement
      event.dataTransfer.setDragImage(dragImage, dragOffset.x, dragOffset.y)
    } catch {}
  }

  const handleDragEnd = () => {
    resetDragState()
  }

  const handleDragOverItem = (slug: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!draggingSlug || saving || draggingSlug === slug) return
    
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect()
    const mouseY = event.clientY - rect.top
    const itemHeight = rect.height
    const threshold = itemHeight * 0.4 // More sensitive threshold
    
    let position: "before" | "after"
    if (mouseY < threshold) {
      position = "before"
    } else if (mouseY > itemHeight - threshold) {
      position = "after"
    } else {
      // In the middle zone, keep current position or default to before
      const indicatorPosition = indicator?.slug === slug ? indicator.position : "before"
      position = indicatorPosition === "end" ? "before" : indicatorPosition
    }
    
    if (indicator?.slug !== slug || indicator.position !== position) {
      setIndicator({ slug, position })
    }
  }

  const handleDropOnItem = (slug: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!draggingSlug || saving || draggingSlug === slug) return
    
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect()
    const mouseY = event.clientY - rect.top
    const itemHeight = rect.height
    const threshold = itemHeight * 0.4
    const placeAfter = mouseY > itemHeight - threshold
    
    const sourceSlug = draggingSlug
    setItems((prev) => {
      const previous = prev.map((lesson) => ({ ...lesson }))
      const targetIndex = prev.findIndex((lesson) => lesson.slug === slug)
      if (targetIndex === -1) return prev
      
      const desiredIndex = targetIndex + (placeAfter ? 1 : 0)
      const next = reorderToIndex(prev, sourceSlug, desiredIndex)
      
      if (ordersMatch(prev, next)) return prev
      
      // Persist order immediately without delay
      persistOrder(next, previous)
      
      return next
    })
    resetDragState()
  }

  const handleDragOverEnd = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!draggingSlug || saving) return
    // Only update indicator if it's not already set to end position
    if (!(indicator?.slug === null && indicator?.position === "end")) {
      setIndicator({ slug: null, position: "end" })
    }
  }

  const handleDropAtEnd = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!draggingSlug || saving) return
    const sourceSlug = draggingSlug
    setItems((prev) => {
      const previous = prev.map((lesson) => ({ ...lesson }))
      const next = reorderToIndex(prev, sourceSlug, prev.length)
      if (ordersMatch(prev, next)) return prev
      persistOrder(next, previous)
      return next
    })
    resetDragState()
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
        No lessons yet for this wiki.
      </div>
    )
  }

  const isGlobalAdmin = currentDev?.role === 'admin' || currentDev?.role === 'superadmin'
  const isSuperAdmin = currentDev?.role === 'superadmin'

  const handleDeleteLesson = async (lessonId: string, lessonSlug: string) => {
    setDeletingId(lessonId || lessonSlug)
    setError(null)
    try {
      const headers = applyDeveloperHeader({ 'Content-Type': 'application/json' })
      const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId || lessonSlug)}?wiki=${encodeURIComponent(wikiSlug)}`, {
        method: 'DELETE',
        headers,
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Failed to delete lesson')
      }
      setItems(prev => prev.filter(l => (l.id || l.slug) !== (lessonId || lessonSlug)))
      setStatus(`Lesson "${lessonSlug}" deleted successfully`)
    } catch (err: any) {
      setError(err?.message || 'Failed to delete lesson')
    } finally {
      setDeletingId(null)
      setDeleteConfirmSlug(null)
      setDeleteConfirmText('')
    }
  }

  return (
    <>
    <div ref={containerRef} className="space-y-2">
      {(saving || status || error) && (
        <div className="flex items-center gap-3 text-xs">
          {saving && <span className="text-gray-500">Saving order...</span>}
          {status && <span className="text-emerald-600">{status}</span>}
          {error && <span className="text-red-600">{error}</span>}
        </div>
      )}
      {items.map((lesson, index) => {
        const duration = typeof lesson.duration_min === "number" && lesson.duration_min > 0 ? lesson.duration_min : 30
        const difficulty = lesson.difficulty || "Beginner"
        const isDragging = draggingSlug === lesson.slug
        const isIndicatorBefore = indicator?.slug === lesson.slug && indicator.position === "before"
        const isIndicatorAfter = indicator?.slug === lesson.slug && indicator.position === "after"
        const isHovered = indicator?.slug === lesson.slug
        const isDraft = lesson.status && lesson.status !== 'published'
        const viewPath = viewBaseUrl
          ? `${viewBaseUrl.replace(/\/$/, '')}/${defaultLocale}/${lesson.slug}`
          : `/${defaultLocale}/${kitSlug}/lesson/${lesson.slug}`
        const previewSuffix = isDraft ? (viewPath.includes('?') ? '&preview=1' : '?preview=1') : ''
        const viewHref = `${viewPath}${previewSuffix}`
        
        const isOwner = isGlobalAdmin || (currentDev?.id && lesson.ownerId === currentDev.id)
        
        const tileClasses = isDragging
          ? "border-primary/60 opacity-50 scale-95 ring-2 ring-primary/40 transform-gpu"
          : isHovered
          ? "border-primary/40 ring-1 ring-primary/20 scale-[1.01] transform-gpu"
          : "border-gray-200 hover:border-gray-300"

        return (
          <div
            key={lesson.slug}
            data-lesson-item
            onDragOver={handleDragOverItem(lesson.slug)}
            onDrop={handleDropOnItem(lesson.slug)}
            className={`relative flex items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all duration-300 ease-out transform-gpu ${tileClasses}`}
          >
            {isIndicatorBefore && (
              <div className="pointer-events-none absolute left-4 right-4 -top-1 h-0.5 rounded-full bg-primary shadow-lg animate-pulse">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"></div>
              </div>
            )}
            {isIndicatorAfter && (
              <div className="pointer-events-none absolute left-4 right-4 -bottom-1 h-0.5 rounded-full bg-primary shadow-lg animate-pulse">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"></div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-6 text-right text-xs font-medium text-gray-400">{index + 1}</span>
                <button
                  type="button"
                  draggable
                  onDragStart={handleDragStart(lesson.slug)}
                  onDragEnd={handleDragEnd}
                  disabled={saving}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 cursor-grab active:cursor-grabbing transform-gpu"
                  aria-label={`Reorder ${lesson.title_en || lesson.title_ar || lesson.slug}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 7h12M4 10h12M4 13h12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  {lesson.title_en || lesson.title_ar || lesson.slug}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {duration} min | {difficulty}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  <Link
                    href={`/editor/lesson?wiki=${wikiSlug}&kit=${kitSlug}&slug=${lesson.slug}&id=${lesson.id || lesson.slug}&title=${encodeURIComponent(lesson.title_en || lesson.slug)}`}
                    className="rounded-md border border-primary/40 px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
                  >
                    Edit
                  </Link>
                  {ENABLE_SEGMENTS_EDITOR && (
                    <Link
                      href={`/editor/segment?wiki=${wikiSlug}&kit=${kitSlug}&id=${lesson.id || lesson.slug}&title=${encodeURIComponent(lesson.title_en || lesson.slug)}`}
                      className="rounded-md border border-amber-400 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50"
                      title="Bilingual Segment Editor"
                    >
                      Content
                    </Link>
                  )}
                </>
              )}
              <Link
                href={viewHref}
                target="_blank"
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                {isOwner ? 'View' : 'Preview'}
              </Link>
              {isSuperAdmin && (
                <button
                  type="button"
                  disabled={deletingId === (lesson.id || lesson.slug)}
                  onClick={() => {
                    setDeleteConfirmSlug(lesson.slug)
                    setDeleteConfirmText('')
                  }}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  title="Delete lesson (Super Admin)"
                >
                  {deletingId === (lesson.id || lesson.slug) ? 'Deleting\u2026' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        )
      })}
      {draggingSlug && (
        <div
          onDragOver={handleDragOverEnd}
          onDrop={handleDropAtEnd}
          className={`h-12 rounded-xl border-2 border-dashed transition-all duration-300 ease-out flex items-center justify-center transform-gpu ${
            indicator?.slug === null && indicator?.position === "end" 
              ? "border-primary bg-primary/10 scale-105 shadow-lg" 
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <span className="text-sm text-gray-500 font-medium transition-colors">
            {indicator?.slug === null && indicator?.position === "end" 
              ? "Drop here to move to end" 
              : "Drop here to move to end"}
          </span>
        </div>
      )}
    </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmSlug && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => { setDeleteConfirmSlug(null); setDeleteConfirmText('') }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 px-6 py-5 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-900">Delete Lesson</h3>
                  <p className="text-xs text-red-600">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-700">
                You are about to permanently delete the lesson{' '}
                <strong className="text-slate-900">&ldquo;{items.find(l => l.slug === deleteConfirmSlug)?.title_en || deleteConfirmSlug}&rdquo;</strong>.
                All content, translations, and media references will be lost.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Type <span className="text-red-600 font-mono bg-red-50 px-1 py-0.5 rounded">{deleteConfirmSlug}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteConfirmSlug || undefined}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => { setDeleteConfirmSlug(null); setDeleteConfirmText('') }}
                className="px-5 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirmText !== deleteConfirmSlug || !!deletingId}
                onClick={() => {
                  const lesson = items.find(l => l.slug === deleteConfirmSlug)
                  if (lesson) handleDeleteLesson(lesson.id || lesson.slug, lesson.slug)
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-200/50 hover:bg-red-700 disabled:opacity-40 disabled:shadow-none disabled:bg-slate-300 transition-all active:scale-95"
              >
                {deletingId ? 'Deleting\u2026' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
