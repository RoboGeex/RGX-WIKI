"use client"

import { useEffect, useRef, useState } from 'react'
import { type DashboardTab } from '@/components/admin-navbar'
import DashboardHome from './DashboardHome'
import StudentsPageClient from './students/StudentsPageClient'
import TeachersPageClient from './teachers/TeachersPageClient'

type Wiki = { slug: string; displayName: string }

type Props = {
  userInitials: string
  userAvatarUrl?: string | null
  userName?: string | null
  userEmail?: string | null
  initialTab: DashboardTab
  // Seeded server data for each tab — see the individual clients.
  stats: any
  people: any
  wikiHealth: any
  students: any
  teachers: any
  wikis: Wiki[]
}

const PATH_TAB: Record<string, DashboardTab> = {
  '/dashboard': 'overview',
  '/dashboard/students': 'students',
  '/dashboard/teachers': 'teachers',
}

// Single-page admin dashboard. All three tabs' data is loaded once on the
// server and held here, so switching tabs is pure client state — instant, with
// no navigation or refetch. /dashboard, /dashboard/students, and
// /dashboard/teachers are all real routes that render this same shell (see
// load-dashboard-shell-props), so bookmarks/refreshes/shared links work
// normally; switching tabs afterward only rewrites the URL via the History API
// (pushState), which Next's router never sees, so it never triggers a
// navigation or refetch.
export default function AdminDashboardShell({
  initialTab,
  stats,
  people,
  wikiHealth,
  students,
  teachers,
  wikis,
}: Props) {
  const [tab, setTab] = useState<DashboardTab>(initialTab)
  // Tracks the current tab outside React state so pushState fires exactly once
  // per click. (A setState updater is the wrong place for this: React can
  // invoke updater functions more than once per update — e.g. under dev Strict
  // Mode — which would silently push duplicate history entries and desync the
  // Back button.)
  const tabRef = useRef(initialTab)

  // Browser Back/Forward moves through the pushState entries above without a
  // real navigation — sync our tab state to match.
  useEffect(() => {
    function onPopState() {
      const next = PATH_TAB[window.location.pathname] ?? 'overview'
      tabRef.current = next
      setTab(next)
    }
    window.addEventListener('popstate', onPopState)
    function onTabChange(event: Event) {
      const next = (event as CustomEvent<DashboardTab>).detail
      if (!next) return
      tabRef.current = next
      setTab(next)
    }
    window.addEventListener('admin-tab-change', onTabChange)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('admin-tab-change', onTabChange)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      {tab === 'overview' && (
        <main className="w-full px-4 pb-28 pt-[88px] sm:px-6 lg:ml-[272px] lg:w-[calc(100%-272px)] lg:px-10 lg:pb-16 lg:pt-10">
          <div className="mx-auto max-w-[1280px]">
            <DashboardHome initialStats={stats} initialPeople={people} initialWikiHealth={wikiHealth} />
          </div>
        </main>
      )}

      {tab === 'students' && (
        <main className="dashboard-text-scale w-full px-4 pb-28 pt-[88px] sm:px-6 lg:ml-[272px] lg:w-[calc(100%-272px)] lg:px-10 lg:pb-12 lg:pt-10">
          <div className="mx-auto max-w-[1280px]"><StudentsPageClient initialStudents={students} /></div>
        </main>
      )}

      {tab === 'teachers' && (
        <main className="dashboard-text-scale w-full px-4 pb-28 pt-[88px] sm:px-6 lg:ml-[272px] lg:w-[calc(100%-272px)] lg:px-10 lg:pb-12 lg:pt-10">
          <div className="mx-auto max-w-[1280px]"><TeachersPageClient wikis={wikis} initialTeachers={teachers} /></div>
        </main>
      )}
    </div>
  )
}
