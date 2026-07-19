"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Cairo } from 'next/font/google'
import { Activity, AlertTriangle, BookOpen, CheckCircle2, ChevronRight, GraduationCap, Plus, RefreshCw, UserPlus, Users } from 'lucide-react'
import CategoriesCard from './CategoriesCard'
import CreateWikiModal from '@/components/create-wiki-modal'
import { applyDeveloperHeader } from '@/components/editor/dev-identity'
import { formatUtcDate } from '@/lib/format-date'

const display = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-cairo' })

type Stats = { teachers: number; students: number; wikis: number; activeSessions: number }
type AdminUser = {
  source: 'user'; id: string; email: string; name: string | null
  avatarUrl?: string | null; disabledAt: string | null; createdAt: string; lastLoginAt: string | null; activeSessions: number
}
type DevUser = { source: 'developer'; id: string; email: string; name: string | null; avatarUrl?: string | null; createdAt: string; role: string }
type WikiHealth = {
  slug: string; name: string; teacher: string | null
  enrolled: number; totalLessons: number; avgCompletion: number; totalInProgress: number
}
type FlaggedLesson = {
  id: string; title: string; wikiSlug: string; wikiName: string
  status: string; updatedAt: string; publishedAt: string | null
}
type DashboardHomeProps = {
  initialStats?: Stats | null
  initialPeople?: { admins: AdminUser[]; developers: DevUser[] } | null
  initialWikiHealth?: { wikis: WikiHealth[]; lessons: FlaggedLesson[] } | null
}

function timeAgo(date: string | null) {
  if (!date) return 'Never'
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 30 ? `${days}d ago` : formatUtcDate(date)
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  const parts = source.split(/\s+/)
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : source.slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = ['bg-slate-700', 'bg-blue-700', 'bg-emerald-700', 'bg-indigo-700', 'bg-amber-700']
function avatarColor(id: string) {
  let hash = 0
  for (let index = 0; index < id.length; index++) hash = (hash * 31 + id.charCodeAt(index)) & 0xffffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
      <div>
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

function Stat({ label, value, note, icon: Icon, href, loading }: {
  label: string; value: number; note: string; icon: any; href?: string; loading: boolean
}) {
  const body = (
    <div className="flex h-full items-start gap-3 px-5 py-4 transition-colors hover:bg-slate-50">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500"><Icon size={16} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {loading ? <div className="mt-2 h-7 w-12 animate-pulse rounded bg-slate-100" /> : <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</p>}
        <p className="mt-1 truncate text-[11px] text-slate-400">{note}</p>
      </div>
      {href && <ChevronRight size={15} className="mt-2 text-slate-300" />}
    </div>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

export default function DashboardHome({ initialStats = null, initialPeople = null, initialWikiHealth = null }: DashboardHomeProps) {
  const [stats, setStats] = useState<Stats | null>(initialStats)
  const [admins, setAdmins] = useState<AdminUser[]>(initialPeople?.admins ?? [])
  const [developers, setDevelopers] = useState<DevUser[]>(initialPeople?.developers ?? [])
  const [wikiHealth, setWikiHealth] = useState<WikiHealth[]>(initialWikiHealth?.wikis ?? [])
  const [flaggedLessons, setFlaggedLessons] = useState<FlaggedLesson[]>(initialWikiHealth?.lessons ?? [])
  const [loadingStats, setLoadingStats] = useState(initialStats == null)
  const [loadingPeople, setLoadingPeople] = useState(initialPeople == null)
  const [loadingWikis, setLoadingWikis] = useState(initialWikiHealth == null)
  const [refreshedAt, setRefreshedAt] = useState(() => new Date())
  const [isSuperadmin, setIsSuperadmin] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    fetch('/api/developers/me', { headers: applyDeveloperHeader() as HeadersInit })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setIsSuperadmin(data?.developer?.role === 'superadmin'))
      .catch(() => {})
  }, [])

  const loadAll = useCallback(() => {
    setLoadingStats(true)
    setLoadingPeople(true)
    setLoadingWikis(true)
    setRefreshedAt(new Date())
    fetch('/api/admin/stats').then((response) => response.json()).then(setStats).finally(() => setLoadingStats(false))
    fetch('/api/admin/admins').then((response) => response.json()).then((data) => {
      setAdmins(data.admins || [])
      setDevelopers(data.developers || [])
    }).finally(() => setLoadingPeople(false))
    fetch('/api/admin/wiki-health').then((response) => response.json()).then((data) => {
      setWikiHealth(data.wikis || [])
      setFlaggedLessons(data.lessons || [])
    }).finally(() => setLoadingWikis(false))
  }, [])

  useEffect(() => {
    if (initialStats != null && initialPeople != null && initialWikiHealth != null) return
    loadAll()
  }, [initialPeople, initialStats, initialWikiHealth, loadAll])

  const people = useMemo(() => [
    ...admins.map((person) => ({ id: person.id, name: person.name, email: person.email, avatarUrl: person.avatarUrl, role: 'admin', lastLoginAt: person.lastLoginAt, activeSessions: person.activeSessions })),
    ...developers.map((person) => ({ id: person.id, name: person.name, email: person.email, avatarUrl: person.avatarUrl, role: person.role, lastLoginAt: null as string | null, activeSessions: 0 })),
  ], [admins, developers])

  const rankedWikis = useMemo(() => [...wikiHealth].sort((a, b) => b.avgCompletion - a.avgCompletion), [wikiHealth])
  const totalEnrollments = wikiHealth.reduce((sum, wiki) => sum + wiki.enrolled, 0)
  const totalLessons = wikiHealth.reduce((sum, wiki) => sum + wiki.totalLessons, 0)
  const learningNow = wikiHealth.reduce((sum, wiki) => sum + (wiki.totalInProgress ?? 0), 0)
  const averageCompletion = wikiHealth.length ? Math.round(wikiHealth.reduce((sum, wiki) => sum + wiki.avgCompletion, 0) / wikiHealth.length) : 0
  const lowEngagement = wikiHealth.filter((wiki) => wiki.avgCompletion < 25).length
  const dateLabel = refreshedAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className={`${display.variable} rgx-dash dashboard-text-scale space-y-5 text-slate-950`}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Overview</h1>
          <p className="mt-1 text-sm text-slate-500" suppressHydrationWarning>{dateLabel} · Updated {timeAgo(refreshedAt.toISOString()).toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
          {isSuperadmin && <button onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#E94335] px-3.5 text-xs font-semibold text-white transition hover:bg-[#d83b2e]"><Plus size={14} /> New wiki</button>}
        </div>
      </header>

      <section className="grid overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-slate-200">
        <Stat label="Students" value={stats?.students ?? 0} note="Across all learning tracks" icon={Users} href="/dashboard/students" loading={loadingStats} />
        <Stat label="Teachers" value={stats?.teachers ?? 0} note="Registered teacher accounts" icon={GraduationCap} href="/dashboard/teachers" loading={loadingStats} />
        <Stat label="Published wikis" value={stats?.wikis ?? 0} note={`${totalLessons} lessons available`} icon={BookOpen} loading={loadingStats} />
        <Stat label="Active sessions" value={stats?.activeSessions ?? 0} note="Administrator sessions" icon={Activity} loading={loadingStats} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <SectionHeader title="Wiki performance" description={`${totalEnrollments} enrollments · ${learningNow} learners currently in progress`} action={<Link href="/editor" className="text-xs font-semibold text-slate-600 hover:text-slate-950">Manage wikis</Link>} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5">Wiki</th><th className="px-4 py-2.5">Lessons</th><th className="px-4 py-2.5">Enrolled</th><th className="px-4 py-2.5">In progress</th><th className="w-56 px-5 py-2.5">Completion</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingWikis ? [1, 2, 3, 4].map((item) => <tr key={item}><td colSpan={5} className="px-5 py-3"><div className="h-6 animate-pulse rounded bg-slate-100" /></td></tr>) : rankedWikis.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">No wiki data available.</td></tr> : rankedWikis.map((wiki) => (
                    <tr key={wiki.slug} className="text-sm hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-semibold text-slate-800">{wiki.name}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{wiki.totalLessons}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{wiki.enrolled}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{wiki.totalInProgress ?? 0}</td>
                      <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-700" style={{ width: `${Math.max(wiki.avgCompletion, 2)}%` }} /></div><span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-600">{wiki.avgCompletion}%</span></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <SectionHeader title="Team access" description={`${people.length} administrators and editors`} action={<Link href="/dashboard/teachers?invite=1" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950"><UserPlus size={14} /> Invite</Link>} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5">Person</th><th className="px-4 py-2.5">Role</th><th className="px-4 py-2.5">Last seen</th><th className="px-5 py-2.5 text-right">Sessions</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingPeople ? [1, 2, 3].map((item) => <tr key={item}><td colSpan={4} className="px-5 py-3"><div className="h-8 animate-pulse rounded bg-slate-100" /></td></tr>) : people.slice(0, 8).map((person) => (
                    <tr key={person.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3"><div className="flex items-center gap-3"><div className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md text-[11px] font-bold text-white ${avatarColor(person.id)}`}>{person.avatarUrl ? <img src={person.avatarUrl} alt={person.name || person.email} className="h-full w-full object-cover" /> : initials(person.name, person.email)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{person.name || 'Unnamed account'}</p><p className="truncate text-xs text-slate-400">{person.email}</p></div></div></td>
                      <td className="px-4 py-3"><span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium capitalize text-slate-600">{person.role}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500" suppressHydrationWarning>{timeAgo(person.lastLoginAt)}</td>
                      <td className="px-5 py-3 text-right text-xs font-medium tabular-nums text-slate-600">{person.activeSessions || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <SectionHeader title="Operational summary" />
            <dl className="divide-y divide-slate-100 px-5">
              <div className="flex items-center justify-between py-3.5"><dt className="text-sm text-slate-600">Average completion</dt><dd className="text-sm font-semibold tabular-nums text-slate-900">{averageCompletion}%</dd></div>
              <div className="flex items-center justify-between py-3.5"><dt className="text-sm text-slate-600">Low-engagement wikis</dt><dd className={`text-sm font-semibold tabular-nums ${lowEngagement ? 'text-amber-700' : 'text-slate-900'}`}>{lowEngagement}</dd></div>
              <div className="flex items-center justify-between py-3.5"><dt className="text-sm text-slate-600">Lessons needing review</dt><dd className={`text-sm font-semibold tabular-nums ${flaggedLessons.length ? 'text-amber-700' : 'text-slate-900'}`}>{flaggedLessons.length}</dd></div>
              <div className="flex items-center justify-between py-3.5"><dt className="text-sm text-slate-600">Published lessons</dt><dd className="text-sm font-semibold tabular-nums text-slate-900">{totalLessons}</dd></div>
            </dl>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <SectionHeader title="Needs attention" action={flaggedLessons.length === 0 ? <CheckCircle2 size={16} className="text-emerald-600" /> : <span className="rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">{flaggedLessons.length} open</span>} />
            {loadingWikis ? <div className="space-y-2 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded bg-slate-100" />)}</div> : flaggedLessons.length === 0 ? <div className="flex items-center gap-2 px-5 py-5 text-sm text-slate-500"><CheckCircle2 size={16} className="text-emerald-600" /> No pending content changes.</div> : <div className="divide-y divide-slate-100">{flaggedLessons.slice(0, 5).map((lesson) => (
              <div key={lesson.id} className="flex gap-3 px-5 py-3.5"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{lesson.title}</p><p className="mt-0.5 truncate text-xs text-slate-400">{lesson.wikiName} · <span suppressHydrationWarning>{timeAgo(lesson.updatedAt)}</span></p></div></div>
            ))}</div>}
          </section>

          <CategoriesCard />
        </aside>
      </div>

      {isSuperadmin && <CreateWikiModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onSubmit={async () => window.location.reload()} />}
    </div>
  )
}
