import { redirect } from 'next/navigation'

// Students now lives as a tab inside the single-page dashboard. Redirect any
// direct hits / old bookmarks to the dashboard on the students tab.
export const dynamic = 'force-dynamic'

export default function StudentsRedirect() {
  redirect('/dashboard?tab=students')
}
