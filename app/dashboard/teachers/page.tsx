import { redirect } from 'next/navigation'

// Teachers now lives as a tab inside the single-page dashboard. Redirect any
// direct hits / old bookmarks to the dashboard on the teachers tab.
export const dynamic = 'force-dynamic'

export default function TeachersRedirect() {
  redirect('/dashboard?tab=teachers')
}
