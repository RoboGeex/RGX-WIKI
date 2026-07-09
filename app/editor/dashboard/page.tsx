import { redirect } from "next/navigation"

// The wikis screen moved from /editor/dashboard to /editor itself.
// Kept as a redirect so old links and bookmarks keep working.
export default function LegacyEditorDashboardPage() {
  redirect("/editor")
}
