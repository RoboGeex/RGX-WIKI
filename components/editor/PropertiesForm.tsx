"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import fallbackLessons from '@/data/lessons.student-kit.json'

type WikiOption = {
  slug: string
  displayName: string
}

type LessonMeta = {
  id: string
  slug: string
  wikiSlug: string
  order: number
  title_en: string
  title_ar: string
  duration_min: number
  difficulty: string
}

const DEFAULT_WIKI = 'student-kit'

type FallbackLesson = {
  id: string
  slug: string
  wikiSlug?: string
  order?: number
  title_en?: string
  title_ar?: string
  duration_min?: number
  difficulty?: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function PropertiesForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slugFromQuery = searchParams?.get('slug')?.trim() ?? ''
  const idFromQuery = searchParams?.get('id')?.trim() ?? ''
  const wikiFromQuery = searchParams?.get('wiki')?.trim() ?? ''
  const kitFromQuery = searchParams?.get('kit')?.trim() ?? ''
  const isNewLesson = searchParams?.get('new') === 'true'

  const [wikis, setWikis] = useState<WikiOption[]>([])
  const [loadStatus, setLoadStatus] = useState('')
  const [error, setError] = useState('')
  const [hydrating, setHydrating] = useState(false)
  const [loadInput, setLoadInput] = useState('')
  const [autoHydrateDone, setAutoHydrateDone] = useState(false)

  const initialWikiSlug = wikiFromQuery || DEFAULT_WIKI

  const [meta, setMeta] = useState<LessonMeta>(() => {
    const base: LessonMeta = {
      id: '',
      slug: '',
      wikiSlug: initialWikiSlug,
      order: 0,
      title_en: '',
      title_ar: '',
      duration_min: 30,
      difficulty: 'Beginner',
    }
    
    // If creating a new lesson, clear session storage and don't load existing data
    if (isNewLesson && typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('lessonMeta')
      } catch {}
    } else if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('lessonMeta')
        if (raw) Object.assign(base, JSON.parse(raw))
      } catch {}
    }
    
    if (slugFromQuery) base.slug = slugFromQuery
    if (idFromQuery) base.id = idFromQuery
    if (!base.slug && base.id) base.slug = slugify(base.id)
    if (wikiFromQuery) base.wikiSlug = wikiFromQuery
    return base
  })

  const isGettingStarted = meta.slug === 'getting-started' || meta.id === 'getting-started'

  const kitSlug = kitFromQuery || meta.wikiSlug

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/wikis', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch wikis')
        const data = await res.json()
        setWikis(data)
        if (data.length && !data.some((w: WikiOption) => w.slug === meta.wikiSlug)) {
          setMeta((prev) => ({ ...prev, wikiSlug: data[0].slug }))
        }
      } catch (e) {
        console.error('Failed to load wikis', e)
        setWikis([{ slug: DEFAULT_WIKI, displayName: 'Student Kit' }])
      }
    })()
  }, [meta.wikiSlug])

  useEffect(() => {
    if (!slugFromQuery && !idFromQuery && !wikiFromQuery) return
    setMeta((prev) => {
      const next = { ...prev }
      let changed = false
      if (slugFromQuery && prev.slug !== slugFromQuery) { next.slug = slugFromQuery; changed = true }
      if (idFromQuery && prev.id !== idFromQuery) { next.id = idFromQuery; changed = true }
      if (wikiFromQuery && prev.wikiSlug !== wikiFromQuery) { next.wikiSlug = wikiFromQuery; changed = true }
      if (!next.slug && next.id) { next.slug = slugify(next.id); changed = true }
      return changed ? next : prev
    })
  }, [slugFromQuery, idFromQuery, wikiFromQuery])

  const fallbackLessonMap = useMemo(() => {
    const map = new Map<string, FallbackLesson>()
    ;(fallbackLessons as FallbackLesson[]).forEach((lesson) => {
      map.set(lesson.slug, lesson)
      map.set(lesson.id, lesson)
    })
    return map
  }, [])

  const updateMeta = (partial: Partial<LessonMeta>) => {
    setError('')
    setMeta((prev) => {
      const next = { ...prev, ...partial }
      if (partial.id !== undefined) {
        const trimmedId = typeof partial.id === 'string' ? partial.id.trim() : ''
        if (!next.slug && trimmedId) {
          next.slug = slugify(trimmedId)
        }
      }
      return next
    })
  }

  const applyTitle = (value: string, language: 'en' | 'ar') => {
    setError('')
    setMeta((prev) => {
      const next = { ...prev }
      if (language === 'en') next.title_en = value
      else next.title_ar = value
      const enTitle = (language === 'en' ? value : next.title_en) || ''
      const arTitle = (language === 'ar' ? value : next.title_ar) || ''
      const idValue = next.id || ''
      const slugSource = enTitle.trim() || arTitle.trim() || idValue.trim()
      if (slugSource) {
        const slugCandidate = slugify(slugSource)
        if (slugCandidate) {
          next.slug = slugCandidate
          if (!next.id) next.id = slugCandidate
        }
      }
      return next
    })
  }

  const hydrateLesson = async (identifier: string) => {
    const key = identifier.trim()
    if (!key) return
    setHydrating(true)
    setLoadStatus('Loading lesson data...')
    try {
      let lesson: any | undefined = fallbackLessonMap.get(key)
      if (!lesson) {
        const res = await fetch(`/api/lessons?kit=${encodeURIComponent(kitSlug)}`)
        if (res.ok) {
          const list = await res.json()
          lesson = list.find((item: any) => item.slug === key || item.id === key)
        }
      }
      if (!lesson) {
        setError('Lesson not found in existing data')
        return
      }
      setMeta((prev) => ({
        ...prev,
        id: lesson.id || prev.id,
        slug: lesson.slug || prev.slug,
        order: lesson.order ?? prev.order,
        wikiSlug: lesson.wikiSlug || prev.wikiSlug,
        title_en: lesson.title_en || prev.title_en,
        title_ar: lesson.title_ar || prev.title_ar,
        duration_min: lesson.duration_min ?? prev.duration_min,
        difficulty: lesson.difficulty || prev.difficulty,
      }))
      setLoadStatus('Lesson data loaded. Review and adjust if needed.')
    } finally {
      setHydrating(false)
    }
  }

  useEffect(() => {
    const identifier = slugFromQuery || idFromQuery
    if (!identifier || autoHydrateDone) return
    setAutoHydrateDone(true)
    hydrateLesson(identifier)
  }, [slugFromQuery, idFromQuery, autoHydrateDone, kitSlug])

  const handleOpenEditor = () => {
    const nextMeta: LessonMeta = { ...meta }
    if (!nextMeta.id) nextMeta.id = slugify(nextMeta.slug || nextMeta.title_en || nextMeta.title_ar)
    if (!nextMeta.slug) nextMeta.slug = slugify(nextMeta.id || nextMeta.title_en || nextMeta.title_ar)
    if (!nextMeta.id || !nextMeta.slug) {
      setError('Please provide an ID or title to generate identifiers.')
      return
    }
    if (!nextMeta.title_en && !nextMeta.title_ar) {
      setError('Please provide at least one title')
      return
    }
    try {
      sessionStorage.setItem('lessonMeta', JSON.stringify(nextMeta))
    } catch {}
    router.push('/editor')
  }

  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-semibold text-lg mb-2">Lesson Properties</h1>
        {loadStatus && <div className="mb-4 text-sm text-gray-600">{loadStatus}</div>}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Wiki</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={meta.wikiSlug}
              onChange={(e) => updateMeta({ wikiSlug: e.target.value })}
            >
              {wikis.map((wiki) => (
                <option key={wiki.slug} value={wiki.slug}>
                  {wiki.displayName || wiki.slug}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Title (EN) {isGettingStarted && <span className="text-orange-600">(Fixed)</span>}
              </label>
              <input
                className={`w-full border rounded px-2 py-1 ${isGettingStarted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                value={meta.title_en}
                onChange={(e) => applyTitle(e.target.value, 'en')}
                readOnly={isGettingStarted}
                disabled={isGettingStarted}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Title (AR) {isGettingStarted && <span className="text-orange-600">(Fixed)</span>}
              </label>
              <input
                className={`w-full border rounded px-2 py-1 ${isGettingStarted ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                value={meta.title_ar}
                onChange={(e) => applyTitle(e.target.value, 'ar')}
                readOnly={isGettingStarted}
                disabled={isGettingStarted}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Duration (min)</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1"
              value={meta.duration_min}
              onChange={(e) => updateMeta({ duration_min: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Difficulty</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={meta.difficulty}
              onChange={(e) => updateMeta({ difficulty: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Load existing lesson</label>
            <div className="flex gap-2">
              <input
                placeholder="Enter lesson slug or ID"
                className="flex-1 border rounded px-2 py-1"
                value={loadInput}
                onChange={(e) => setLoadInput(e.target.value)}
              />
              <button
                className="px-3 py-1.5 rounded-md border text-sm"
                onClick={() => hydrateLesson(loadInput)}
                disabled={hydrating}
              >
                {hydrating ? 'Loading...' : 'Load'}
              </button>
            </div>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between">
            {error ? <div className="text-sm text-red-600">{error}</div> : <div />}
            <button
              className="px-3 py-1.5 rounded-md bg-primary text-white text-sm shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={handleOpenEditor}
            >
              Open Editor
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


