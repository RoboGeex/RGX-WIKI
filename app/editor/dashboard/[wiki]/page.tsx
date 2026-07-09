import { redirect } from "next/navigation"

// The per-wiki lessons screen moved from /editor/dashboard/[wiki] to
// /editor/[wiki]. Kept as a redirect (preserving the ?kit= reorder param)
// so old links and bookmarks keep working.
export default function LegacyEditorWikiPage({
  params,
  searchParams,
}: {
  params: { wiki: string }
  searchParams: { kit?: string }
}) {
  const kitQuery = searchParams.kit ? `?kit=${encodeURIComponent(searchParams.kit)}` : ""
  redirect(`/editor/${encodeURIComponent(params.wiki)}${kitQuery}`)
}
