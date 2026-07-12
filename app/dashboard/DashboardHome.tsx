"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Cairo } from 'next/font/google'
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Clock3,
  GraduationCap,
  Layers3,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
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

const AVATAR_COLORS = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-500', 'bg-cyan-600', 'bg-rose-500']
function avatarColor(id: string) {
  let hash = 0
  for (let index = 0; index < id.length; index++) hash = (hash * 31 + id.charCodeAt(index)) & 0xffffff
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function MetricCard({ label, value, detail, icon: Icon, href, loading, accent }: {
  label: string
  value: number
  detail: string
  icon: any
  href?: string
  loading: boolean
  accent: string
}) {
  const content = (
    <div className="group relative h-full overflow-hidden rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_-26px_rgba(15,23,42,.55)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-24px_rgba(15,23,42,.35)]">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-slate-500">{label}</p>
          {loading ? <div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-slate-100" /> : <p className="mt-2 text-[34px] font-extrabold leading-none tracking-[-0.04em] text-slate-950">{value}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-950 group-hover:text-white">
          <Icon size={19} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-400">{detail}</p>
        {href && <ChevronRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-600" />}
      </div>
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

function PanelHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">{title}</h2>
      </div>
      {action}
    </div>
  )
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
    fetch('/api/admin/stats').then((response) => response.json()).then((data) => setStats(data)).finally(() => setLoadingStats(false))
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

  const allPeople = useMemo(() => [
    ...admins.map((person) => ({ id: person.id, name: person.name, email: person.email, avatarUrl: person.avatarUrl, role: 'admin', lastLoginAt: person.lastLoginAt, activeSessions: person.activeSessions })),
    ...developers.map((person) => ({ id: person.id, name: person.name, email: person.email, avatarUrl: person.avatarUrl, role: person.role, lastLoginAt: null as string | null, activeSessions: 0 })),
  ], [admins, developers])

  const rankedWikis = useMemo(() => [...wikiHealth].sort((a, b) => b.avgCompletion - a.avgCompletion), [wikiHealth])
  const totalEnrollments = wikiHealth.reduce((sum, wiki) => sum + wiki.enrolled, 0)
  const totalLessons = wikiHealth.reduce((sum, wiki) => sum + wiki.totalLessons, 0)
  const learningNow = wikiHealth.reduce((sum, wiki) => sum + wiki.totalInProgress, 0)
  const averageCompletion = wikiHealth.length ? Math.round(wikiHealth.reduce((sum, wiki) => sum + wiki.avgCompletion, 0) / wikiHealth.length) : 0
  const lowEngagement = wikiHealth.filter((wiki) => wiki.avgCompletion < 25).length
  const activePeople = allPeople.filter((person) => person.activeSessions > 0).length
  const dayName = refreshedAt.toLocaleDateString('en-US', { weekday: 'long' })
  const dateLabel = refreshedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <div className={`${display.variable} rgx-dash dashboard-text-scale space-y-6 text-slate-950`}>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" />
            Live academy overview
          </div>
          <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-[42px]">Command center</h1>
          <p className="mt-2 text-sm font-medium text-slate-500" suppressHydrationWarning>{dayName}, {dateLabel} · Data refreshed {timeAgo(refreshedAt.toISOString()).toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950">
            <RefreshCw size={16} /> Refresh
          </button>
          {isSuperadmin && (
            <button onClick={() => setCreateOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-[0_12px_24px_-14px_rgba(15,23,42,.8)] transition hover:-translate-y-0.5 hover:bg-slate-800">
              <Plus size={17} /> New wiki
            </button>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Students" value={stats?.students ?? 0} detail="Across all learning tracks" icon={Users} href="/dashboard/students" loading={loadingStats} accent="bg-blue-500" />
        <MetricCard label="Teachers" value={stats?.teachers ?? 0} detail="Active teaching accounts" icon={GraduationCap} href="/dashboard/teachers" loading={loadingStats} accent="bg-violet-500" />
        <MetricCard label="Published wikis" value={stats?.wikis ?? 0} detail={`${totalLessons} lessons available`} icon={BookOpen} loading={loadingStats} accent="bg-emerald-500" />
        <MetricCard label="Live sessions" value={stats?.activeSessions ?? 0} detail={`${activePeople} admins online now`} icon={Activity} loading={loadingStats} accent="bg-amber-400" />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_16px_44px_-34px_rgba(15,23,42,.45)] xl:col-span-8">
          <PanelHeader
            eyebrow="Performance"
            title="Wiki engagement"
            action={<Link href="/editor" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200">Manage wikis <ArrowUpRight size={14} /></Link>}
          />
          <div className="grid border-y border-slate-100 bg-slate-50/70 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
            <div className="px-6 py-4"><p className="text-2xl font-extrabold tracking-tight">{averageCompletion}%</p><p className="text-xs font-semibold text-slate-400">Average completion</p></div>
            <div className="px-6 py-4"><p className="text-2xl font-extrabold tracking-tight">{totalEnrollments}</p><p className="text-xs font-semibold text-slate-400">Total enrollments</p></div>
            <div className="px-6 py-4"><p className="text-2xl font-extrabold tracking-tight">{learningNow}</p><p className="text-xs font-semibold text-slate-400">Learners in progress</p></div>
          </div>
          <div className="space-y-5 p-6">
            {loadingWikis ? [1, 2, 3, 4].map((item) => <div key={item} className="h-10 animate-pulse rounded-xl bg-slate-100" />) : rankedWikis.length === 0 ? (
              <div className="py-10 text-center text-sm font-medium text-slate-400">No published wiki data yet.</div>
            ) : rankedWikis.slice(0, 6).map((wiki, index) => (
              <div key={wiki.slug} className="grid grid-cols-[28px_minmax(120px,1fr)_minmax(120px,2fr)_52px] items-center gap-3">
                <span className="text-xs font-extrabold text-slate-300">{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0"><p className="truncate text-sm font-extrabold text-slate-800">{wiki.name}</p><p className="text-[11px] font-medium text-slate-400">{wiki.enrolled} learners · {wiki.totalLessons} lessons</p></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${wiki.avgCompletion >= 50 ? 'bg-emerald-500' : wiki.avgCompletion >= 25 ? 'bg-blue-500' : 'bg-amber-400'}`} style={{ width: `${Math.max(wiki.avgCompletion, 2)}%` }} /></div>
                <span className="text-right text-sm font-extrabold text-slate-700">{wiki.avgCompletion}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] bg-slate-950 p-6 text-white shadow-[0_24px_50px_-28px_rgba(15,23,42,.75)] xl:col-span-4">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Sparkles size={20} /></div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/50">LIVE SIGNALS</span>
            </div>
            <h2 className="mt-6 text-2xl font-extrabold tracking-tight">What needs your eye</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">A quick read of content and engagement risks.</p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300"><AlertTriangle size={19} /></div>
                <div className="flex-1"><p className="text-sm font-extrabold">{flaggedLessons.length} lessons to review</p><p className="text-xs text-white/40">Draft or unpublished changes</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/15 text-blue-300"><TrendingUp size={19} /></div>
                <div className="flex-1"><p className="text-sm font-extrabold">{lowEngagement} low-engagement wikis</p><p className="text-xs text-white/40">Below 25% average completion</p></div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300"><Layers3 size={19} /></div>
                <div className="flex-1"><p className="text-sm font-extrabold">{totalLessons} lessons live</p><p className="text-xs text-white/40">Across {wikiHealth.length} published wikis</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_16px_44px_-34px_rgba(15,23,42,.45)] xl:col-span-8">
          <PanelHeader
            eyebrow="Team access"
            title="Admins & editors"
            action={<Link href="/dashboard/teachers?invite=1" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"><UserPlus size={14} /> Invite</Link>}
          />
          <div className="grid gap-2 px-3 pb-3 sm:grid-cols-2">
            {loadingPeople ? [1, 2, 3, 4].map((item) => <div key={item} className="h-[76px] animate-pulse rounded-2xl bg-slate-100" />) : allPeople.slice(0, 8).map((person) => (
              <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-transparent p-3 transition hover:border-slate-200 hover:bg-slate-50">
                <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-extrabold text-white ${avatarColor(person.id)}`}>
                  {person.avatarUrl ? <img src={person.avatarUrl} alt={person.name || person.email} className="h-full w-full object-cover" /> : initials(person.name, person.email)}
                </div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-slate-800">{person.name || 'Unnamed account'}</p><p className="truncate text-xs font-medium text-slate-400">{person.email}</p></div>
                <div className="text-right"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-extrabold uppercase text-slate-500">{person.role}</span><p className="mt-1 text-[10px] font-semibold text-slate-400" suppressHydrationWarning>{timeAgo(person.lastLoginAt)}</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-4"><CategoriesCard /></div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_16px_44px_-34px_rgba(15,23,42,.45)]">
        <PanelHeader
          eyebrow="Content workflow"
          title="Recent items needing attention"
          action={flaggedLessons.length === 0 ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600"><CheckCircle2 size={15} /> All clear</span> : <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-700">{flaggedLessons.length} open</span>}
        />
        {loadingWikis ? <div className="grid gap-3 p-6 pt-0 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}</div> : flaggedLessons.length === 0 ? (
          <div className="mx-6 mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 size={19} /> No pending content changes.</div>
        ) : (
          <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-4">
            {flaggedLessons.slice(0, 4).map((lesson) => (
              <div key={lesson.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm">
                <div className="flex items-center justify-between gap-2"><span className={`rounded-lg px-2 py-1 text-[10px] font-extrabold uppercase ${lesson.status === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600'}`}>{lesson.status === 'draft' ? 'Changed' : lesson.status}</span><Clock3 size={14} className="text-slate-300" /></div>
                <p className="mt-3 truncate text-sm font-extrabold text-slate-800">{lesson.title}</p>
                <p className="mt-1 truncate text-xs font-medium text-slate-400">{lesson.wikiName} · <span suppressHydrationWarning>{timeAgo(lesson.updatedAt)}</span></p>
              </div>
            ))}
          </div>
        )}
      </section>

      {isSuperadmin && <CreateWikiModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onSubmit={async () => window.location.reload()} />}
    </div>
  )
}
