'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import SegmentEditor from '@/components/editor/SegmentEditor'
import { applyDeveloperHeader } from '@/components/editor/dev-identity'
import { Segment, convertSegmentsToBody } from '@/lib/segment-types'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function SegmentEditorPage() {
  const searchParams = useSearchParams()
  const [lesson, setLesson] = useState<any>(null)
  const [developer, setDeveloper] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const wikiSlug = searchParams?.get('wiki') || searchParams?.get('kit') || 'student-kit'
  const lessonId = searchParams?.get('id') || searchParams?.get('slug') || ''
  const lessonTitle = searchParams?.get('title') || 'Untitled Lesson'
  
  const [previewBaseUrl, setPreviewBaseUrl] = useState<string>('')
  
  useEffect(() => {
    async function loadData() {
      if (!lessonId) {
        setLoading(false)
        return
      }

      try {
        const [lessonRes, meRes, wikisRes] = await Promise.all([
          fetch(`/api/lessons/${lessonId}?kit=${wikiSlug}`),
          fetch('/api/developers/me', { headers: applyDeveloperHeader({}) }),
          fetch('/api/wikis')
        ])

        if (lessonRes.ok) {
          const data = await lessonRes.json()
          setLesson(data)
        } else {
          setError('Failed to load lesson')
        }
        
        if (meRes.ok) {
          const data = await meRes.json()
          if (data.ok) {
            setDeveloper(data.developer)
          }
        }

        if (wikisRes.ok) {
          const wikis = await wikisRes.json()
          const currentWiki = wikis.find((w: any) => w.slug === wikiSlug)
          
          if (currentWiki) {
            const domain = currentWiki.domains && currentWiki.domains.length > 0 ? currentWiki.domains[0] : null
            if (domain) {
              setPreviewBaseUrl(`https://${domain}`)
            } else {
              setPreviewBaseUrl(`https://wiki.robogeex.com/${wikiSlug}`)
            }
          } else {
             // Fallback if wiki not found in list (shouldn't happen usually)
             setPreviewBaseUrl(`https://wiki.robogeex.com/${wikiSlug}`)
          }
        }

      } catch (err) {
        setError('Failed to load lesson')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [lessonId, wikiSlug])

  const handleSave = async (segments: Segment[]) => {
    try {
      // Convert segments back to body format
      const body = convertSegmentsToBody(segments)

      const payload = {
        ...lesson,
        id: lessonId,
        slug: lesson?.slug || lessonId,
        wikiSlug,
        title_en: lesson?.title_en || lessonTitle,
        title_ar: lesson?.title_ar || '',
        body,
        duration_min: lesson?.duration_min || 30,
        difficulty: lesson?.difficulty || 'Beginner',
        prerequisites_en: lesson?.prerequisites_en || [],
        prerequisites_ar: lesson?.prerequisites_ar || [],
        materials: lesson?.materials || [],
      }

      console.log('Saving payload:', payload) // Debug

      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Save failed')
      }

      const result = await res.json()
      console.log('Saved successfully:', result)
    } catch (err) {
      console.error('Save error:', err)
      throw err
    }
  }

  const handlePublish = async () => {
    if (!lesson) return
    try {
      // Create a payload that sets status to published
      const payload = {
        ...lesson,
        status: 'published',
        publishedAt: new Date().toISOString()
      }
      
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Publish failed')
      }

      const result = await res.json()
      alert('Lesson published successfully!')
      // Update local state
      setLesson(result.lesson)
    } catch (err) {
      console.error('Publish error:', err)
      alert('Failed to publish lesson')
    }
  }

  const isAdmin = developer?.role === 'admin'
  const isOwner = lesson?.ownerId === developer?.id || isAdmin // Admins are effectively owners

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="animate-spin" size={24} />
          <span>Loading lesson...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Error State */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Segment Editor */}
      <SegmentEditor
        lessonId={lessonId}
        wikiSlug={wikiSlug}
        initialBody={lesson?.body}
        onSave={handleSave}
        isOwner={isOwner}
        isAdmin={isAdmin}
        onPublish={handlePublish}
        lessonSlug={lesson?.slug}
        previewBaseUrl={previewBaseUrl}
      />
    </div>
  )
}
