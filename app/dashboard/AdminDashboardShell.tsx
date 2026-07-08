"use client"

import { useCallback, useEffect, useState } from 'react'
import AdminNavbar, { type DashboardTab } from '@/components/admin-navbar'
import DashboardHome from './DashboardHome'
import StudentsPageClient from './students/StudentsPageClient'
import TeachersPageClient from './teachers/TeachersPageClient'

type Wiki = { slug: string; displayName: string }

type Props = {
  userInitials: string
  initialTab: DashboardTab
  // Seeded server data for each tab — see the individual clients.
  stats: any
  people: any
  wikiHealth: any
  students: any
  teachers: any
  wikis: Wiki[]
}

// Single-page admin dashboard. All three tabs' data is loaded once on the
// server and held here, so switching tabs is pure client state — instant, with
// no navigation or refetch. The URL is kept in sync (?tab=) for deep links and
// refreshes without triggering a server round-trip.
export default function AdminDashboardShell({
  userInitials,
  initialTab,
  stats,
  people,
  wikiHealth,
  students,
  teachers,
  wikis,
}: Props) {
  const [tab, setTab] = useState<DashboardTab>(initialTab)

  const selectTab = useCallback((next: DashboardTab) => {
    setTab(next)
  }, [])

  // Reflect the active tab in the URL without navigating (keeps refresh/deep
  // links working; the server reads ?tab= to pick the initial tab).
  useEffect(() => {
    const url = tab === 'overview' ? '/dashboard' : `/dashboard?tab=${tab}`
    window.history.replaceState(window.history.state, '', url)
  }, [tab])

  const background =
    tab === 'overview'
      ? 'radial-gradient(circle at 10% 0%, rgba(240,82,63,0.08), transparent 38%), radial-gradient(circle at 92% 4%, rgba(240,82,63,0.06), transparent 36%), linear-gradient(180deg, #FDF6F4 0%, #FBF7F5 100%)'
      : undefined

  return (
    <div className="min-h-screen bg-[#f5f5f4]" style={background ? { background } : undefined}>
      <AdminNavbar userInitials={userInitials} activeTab={tab} onSelectTab={selectTab} />

      {tab === 'overview' && (
        <div className="w-full max-w-[1400px] mx-auto px-6 pt-[96px] pb-14">
          <DashboardHome initialStats={stats} initialPeople={people} initialWikiHealth={wikiHealth} />
        </div>
      )}

      {tab === 'students' && (
        <div className="dashboard-text-scale mx-auto max-w-7xl px-6 pt-20 pb-12">
          <StudentsPageClient initialStudents={students} />
        </div>
      )}

      {tab === 'teachers' && (
        <div className="dashboard-text-scale mx-auto max-w-7xl px-6 pt-20 pb-12">
          <TeachersPageClient wikis={wikis} initialTeachers={teachers} />
        </div>
      )}
    </div>
  )
}
