import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

// The old wiki tile grid lived here (the admin navbar's "Wikis" tab points to
// /editor). The wikis screen is now the sidebar + lessons layout under
// /editor/dashboard, so this route just forwards there.
export default function EditorPage() {
  redirect("/editor/dashboard")
}
