"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import CreateWikiModal from '@/components/create-wiki-modal'
import { applyDeveloperHeader } from '@/components/editor/dev-identity'

interface WikiSummary {
  wiki: {
    slug: string
    displayName?: string
    grade?: string
    picture?: string
  }
  lessonCount: number
}

interface EditorDashboardClientProps {
  initialSummaries: WikiSummary[]
}

export default function EditorDashboardClient({ initialSummaries }: EditorDashboardClientProps) {
  const [summaries, setSummaries] = useState(initialSummaries)
  const [wikiAccess, setWikiAccess] = useState<string[] | null>(null)
  const [loadingAccess, setLoadingAccess] = useState(true)
  const [accessError, setAccessError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadAccess = async () => {
      setLoadingAccess(true)
      setAccessError(null)
      try {
        const res = await fetch('/api/developers/me', { headers: applyDeveloperHeader() })
        const data = await res.json()
        if (!res.ok || !data?.developer) {
          throw new Error(data?.error || 'Failed to load developer')
        }
        if (cancelled) return
        setWikiAccess(Array.isArray(data.developer.wikiSlugs) ? data.developer.wikiSlugs : [])
      } catch (err: any) {
        if (cancelled) return
        setAccessError(err?.message || 'Failed to load developer access')
        setWikiAccess(null)
      } finally {
        if (!cancelled) setLoadingAccess(false)
      }
    }
    loadAccess()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredSummaries = useMemo(() => {
    if (!wikiAccess || wikiAccess.length === 0) return summaries
    return summaries.filter(({ wiki }) => wikiAccess.includes(wiki.slug))
  }, [summaries, wikiAccess])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleWikiCreated = async (data: { name: string; grade: string; picture: File | null }) => {
    // Refresh the page to show the new wiki
    window.location.reload()
  }

  return (
    <>
      {accessError ? (
        <div className="mb-4 text-sm text-red-600">{accessError}</div>
      ) : null}
      {loadingAccess ? (
        <div className="mb-4 text-sm text-gray-600">Loading your access...</div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Create New Wiki Tile - First */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:shadow group"
        >
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Plus size={24} className="text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Create New Wiki</div>
              <div className="text-xs text-gray-500 mt-1">
                Add a new educational wiki
              </div>
            </div>
          </div>
        </button>

        {/* Existing Wiki Tiles */}
        {filteredSummaries.map(({ wiki, lessonCount }) => (
          <Link
            key={wiki.slug}
            href={`/editor/dashboard/${wiki.slug}`}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary/40 hover:shadow"
          >
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Wiki</div>
            <h2 className="text-xl font-semibold text-gray-900">{wiki.displayName || wiki.slug}</h2>
            <p className="mt-4 text-sm text-gray-600">
              {lessonCount} lesson{lessonCount === 1 ? "" : "s"} available
            </p>
          </Link>
        ))}
      </div>

      {/* Create Wiki Modal */}
      <CreateWikiModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleWikiCreated}
      />
    </>
  )
}
