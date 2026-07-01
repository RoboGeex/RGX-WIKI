import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getWiki, getKits } from "@/lib/data"
import { loadLessonsForKit } from "@/lib/lesson-loader"
import { HUB_DOMAIN } from "@/lib/domains"
import LessonsReorderList from "@/components/editor/LessonsReorderList"
import WikiPublishToggle from "@/components/editor/WikiPublishToggle"
import WikiSettingsPanel from "@/components/editor/WikiSettingsPanel"
import WikiAccessGate from "@/components/editor/WikiAccessGate"
import { getWikisFromDb } from "@/lib/server-data"
import { getPrisma } from "@/lib/prisma-multi"
import { findDeveloperById } from "@/lib/developers"
import { canManageWiki } from "@/lib/assignments"

export const dynamic = "force-dynamic"

interface Params {
  params: { wiki: string }
}

export default async function EditorWikiDashboardPage({ 
  params, 
  searchParams 
}: Params & { searchParams: { kit?: string } }) {
  const { wiki: wikiSlug } = params
  const { kit: selectedKitSlug } = searchParams
  const fileWiki = getWiki(wikiSlug)
  const dbWikis = await getWikisFromDb()
  const dbWiki = dbWikis.find((item) => item.slug === wikiSlug)
  const wiki = dbWiki ? { ...(fileWiki || {}), ...dbWiki } : fileWiki
  if (!wiki) notFound()

  // ── Server-side wiki access check ────────────────────────────────────────
  // The login endpoint sets an HTTP-only cookie (rgx_dev_id) alongside the
  // localStorage value, so we can verify permissions here before rendering.
  // If the cookie is absent (old session pre-dating this check), the
  // client-side EditorAuthGate handles the unauthenticated case gracefully.
  const devId = cookies().get('rgx_dev_id')?.value
  if (devId) {
    const developer = await findDeveloperById(devId)
    if (developer && !canManageWiki(developer, wikiSlug)) {
      redirect('/editor/dashboard')
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const initialIsPublished = wiki.isPublished ?? true

  // Fetch scheduledDeletionAt from DB (column may not exist yet — gracefully falls back to null)
  let scheduledDeletionAt: string | null = null
  if (dbWiki) {
    try {
      const prisma = getPrisma() as any
      const rows: any[] = await prisma.$queryRawUnsafe(
        'SELECT scheduledDeletionAt FROM Wiki WHERE slug = ? LIMIT 1',
        wikiSlug,
      )
      const dt = rows?.[0]?.scheduledDeletionAt
      if (dt) scheduledDeletionAt = new Date(dt).toISOString()
    } catch {
      // column not yet created — ignore
    }
  }

  // Only use absolute domain URL in production to ensure local previews work via relative paths
  const viewBaseUrl = process.env.NODE_ENV === 'production' 
    ? `https://${HUB_DOMAIN}/${wiki.slug}`
    : undefined

  const kits = getKits(wiki.slug)
  const kitSummaries = kits.length
    ? kits.map((kit) => ({ slug: kit.slug, title: kit.title_en }))
    : [{ slug: wiki.slug, title: wiki.displayName || wiki.slug }]

  // Filter to specific kit if provided
  const filteredKits = selectedKitSlug 
    ? kitSummaries.filter(kit => kit.slug === selectedKitSlug)
    : kitSummaries

  const groups = await Promise.all(
    filteredKits.map(async (kit) => ({
      kit,
      lessons: await loadLessonsForKit(kit.slug, wiki.slug),
    }))
  )

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      {/* Ensures the HTTP-only cookie is stamped for old sessions so the
          server-side wiki access check fires correctly on refresh */}
      <WikiAccessGate />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link href="/editor/dashboard" className="text-xs uppercase tracking-widest text-gray-500 hover:text-gray-700">
            ← Back to dashboard
          </Link>
          {selectedKitSlug && (
            <>
              <span className="text-xs text-gray-400">/</span>
              <Link href={`/editor/dashboard/${wiki.slug}`} className="text-xs uppercase tracking-widest text-gray-500 hover:text-gray-700">
                Back to wiki
              </Link>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-gray-900">
            {selectedKitSlug ? `${filteredKits[0]?.title} - Reorder Lessons` : wiki.displayName || wiki.slug}
          </h1>
          <div className="flex items-center gap-2">
            <WikiSettingsPanel
              wikiSlug={wiki.slug}
              initialDisplayName={wiki.displayName || wiki.slug}
              initialPicture={(wiki as any).picture || undefined}
              initialScheduledDeletionAt={scheduledDeletionAt}
              initialTags={(wiki as any).tags || []}
            />
            <WikiPublishToggle wikiSlug={wiki.slug} initialIsPublished={initialIsPublished} />
          </div>
        </div>
        {/* Deletion banner — rendered here so it appears above lessons list */}
        {scheduledDeletionAt && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            ⚠ This wiki is scheduled for deletion. Open <strong>Settings</strong> to undo.
          </div>
        )}
        <p className="text-sm text-gray-600">
          {selectedKitSlug ? "Drag and drop to reorder lessons. Getting Started lesson is fixed and cannot be moved or deleted." : "Select a lesson to open it in the editor."}
        </p>
      </div>

      {groups.map(({ kit, lessons }) => (
        <section key={kit.slug} className="space-y-4">
          <header className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{kit.title}</h2>
            <div className="flex items-center gap-3">
              <Link
                href={`/editor/properties?kit=${kit.slug}&wiki=${wiki.slug}&new=true`}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />

                </svg>
                Add Lesson
              </Link>
              <span className="text-xs text-gray-500">{lessons.length} lesson{lessons.length === 1 ? '' : 's'}</span>
            </div>
          </header>
          <LessonsReorderList
            wikiSlug={wiki.slug}
            kitSlug={kit.slug}
            defaultLocale={wiki.defaultLocale || 'en'}
            lessons={lessons.map(({ id, lessonKey, slug, title_en, title_ar, duration_min, difficulty, order, ownerId, status, lastPublishedAt, hasUnpublishedChanges }) => ({
              id,
              lessonKey,
              slug,
              title_en,
              title_ar,
              duration_min,
              difficulty,
              order,
              ownerId,
              status,
              lastPublishedAt,
              hasUnpublishedChanges,
            }))}
            viewBaseUrl={viewBaseUrl}
          />
        </section>
      ))}
    </div>
  )
}



