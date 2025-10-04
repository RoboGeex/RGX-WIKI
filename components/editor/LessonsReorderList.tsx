"use client"

import { useEffect, useState, useRef, type DragEvent } from "react"
import Link from "next/link"

type LessonSummary = {
  id?: string
  slug: string
  title_en?: string
  title_ar?: string
  duration_min?: number
  difficulty?: string
  order?: number
}

type Props = {
  wikiSlug: string
  kitSlug: string
  defaultLocale: string
  lessons: LessonSummary[]
}

function assignSequentialOrder(list: LessonSummary[]): LessonSummary[] {
  return list.map((lesson, idx) => ({ ...lesson, order: idx + 1 }))
}

function normalizeLessons(list: LessonSummary[]): LessonSummary[] {
  const sorted = list.slice().sort((a, b) => {
    // Getting Started lesson always comes first
    if (a.slug === 'getting-started') return -1
    if (b.slug === 'getting-started') return 1
    // Then sort by order
    return (a.order || 0) - (b.order || 0)
  })
  return assignSequentialOrder(sorted)
}

function reorderToIndex(list: LessonSummary[], slug: string, targetIndex: number): LessonSummary[] {
  // Prevent moving getting-started from position 0
  if (slug === 'getting-started' && targetIndex > 0) {
    console.log('Prevented moving getting-started from position 0')
    return list
  }
  
  const next = list.map((lesson) => ({ ...lesson }))
  const fromIndex = next.findIndex((lesson) => lesson.slug === slug)
  if (fromIndex === -1) {
    console.log('Source lesson not found:', slug)
    return list
  }
  
  // Prevent moving any lesson to position 0 if getting-started exists
  const gettingStartedIndex = next.findIndex((lesson) => lesson.slug === 'getting-started')
  if (gettingStartedIndex !== -1 && targetIndex === 0 && slug !== 'getting-started') {
    console.log('Prevented moving lesson to position 0 (getting-started exists)')
    return list
  }
  
  const [moved] = next.splice(fromIndex, 1)
  let target = targetIndex
  
  // Handle special case: moving to the end
  if (targetIndex >= list.length) {
    target = next.length // Insert at the very end
  } else {
    // Normal case: adjust for the removed item
    if (target < 0) target = 0
    if (target > next.length) target = next.length
    if (fromIndex < target) target -= 1
  }
  
  next.splice(target, 0, moved)
  
  console.log('Reordered:', { slug, fromIndex, targetIndex, finalTarget: target })
  return assignSequentialOrder(next)
}

function ordersMatch(a: LessonSummary[], b: LessonSummary[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.slug !== b[i]?.slug) return false
  }
  return true
}

export default function LessonsReorderList({ wikiSlug, kitSlug, defaultLocale, lessons }: Props) {
  const [items, setItems] = useState(() => normalizeLessons(lessons))
  const [draggingSlug, setDraggingSlug] = useState<string | null>(null)
  const [indicator, setIndicator] = useState<{ slug: string | null; position: "before" | "after" | "end" } | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragImageRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setItems(normalizeLessons(lessons))
  }, [lessons])

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
    
    console.log('Persisting order:', { wikiSlug, kitSlug, sequence })
    
    fetch("/api/lessons/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    if (saving || slug === 'getting-started') {
      event.preventDefault()
      return
    }
    
    const dragElement = event.currentTarget.closest('[data-lesson-item]') as HTMLElement
    if (!dragElement) return
    
    // Calculate drag offset for smooth positioning
    const rect = dragElement.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    
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
    if (!draggingSlug || saving || draggingSlug === slug || slug === 'getting-started') return
    
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
    
    // Prevent dropping on position 0 if getting-started exists
    const currentIndex = items.findIndex((lesson) => lesson.slug === slug)
    if (currentIndex !== -1) {
      const targetIndex = currentIndex + (position === "after" ? 1 : 0)
      const gettingStartedIndex = items.findIndex((lesson) => lesson.slug === 'getting-started')
      if (gettingStartedIndex !== -1 && targetIndex === 0 && draggingSlug !== 'getting-started') {
        return
      }
    }
    
    if (indicator?.slug !== slug || indicator.position !== position) {
      setIndicator({ slug, position })
    }
  }

  const handleDropOnItem = (slug: string) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!draggingSlug || saving || draggingSlug === slug || slug === 'getting-started') return
    
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
    console.log('Drag over end zone:', { draggingSlug, indicator })
    // Only update indicator if it's not already set to end position
    if (!(indicator?.slug === null && indicator?.position === "end")) {
      setIndicator({ slug: null, position: "end" })
    }
  }

  const handleDropAtEnd = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!draggingSlug || saving) return
    const sourceSlug = draggingSlug
    console.log('Dropping at end:', { sourceSlug, currentLength: items.length })
    setItems((prev) => {
      const previous = prev.map((lesson) => ({ ...lesson }))
      const next = reorderToIndex(prev, sourceSlug, prev.length)
      console.log('Drop at end - reorder result:', { 
        previous: previous.map(l => l.slug), 
        next: next.map(l => l.slug),
        ordersMatch: ordersMatch(prev, next)
      })
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

  return (
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
                {lesson.slug === 'getting-started' ? (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : (
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
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  {lesson.title_en || lesson.title_ar || lesson.slug}
                  {lesson.slug === 'getting-started' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                      Fixed
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {duration} min | {difficulty}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/editor/properties?wiki=${wikiSlug}&kit=${kitSlug}&slug=${lesson.slug}`}
                className="rounded-md border border-primary/40 px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
              >
                Edit
              </Link>
              <Link
                href={`/${defaultLocale}/${kitSlug}/lesson/${lesson.slug}`}
                target="_blank"
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                View
              </Link>
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
  )
}
