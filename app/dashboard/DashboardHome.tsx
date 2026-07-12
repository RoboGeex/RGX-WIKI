"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Cairo } from 'next/font/google'
import { ChevronRight, UserPlus, RefreshCw, Users, GraduationCap, BookOpen, Activity, Plus } from 'lucide-react'
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

// ── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(d: string | null) {
  if (!d) return 'Never'
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  return days < 30 ? `${days}d ago` : formatUtcDate(d)
}

function initials(name: string | null, email: string) {
  if (name) {
    const p = name.trim().split(/\s+/)
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const COLORS = ['from-[#F0523F] to-[#E23B2E]','from-blue-500 to-blue-600','from-emerald-500 to-emerald-600','from-purple-500 to-purple-600','from-amber-500 to-orange-500','from-teal-500 to-teal-600','from-indigo-500 to-indigo-600']
function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff
  return COLORS[h % COLORS.length]
}

// ── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const s: Record<string, string> = {
    owner: 'border border-[#F6C9C1] text-[#E23B2E] bg-[#FDEDEA]',
    superadmin: 'bg-blue-100 text-blue-700',
    admin: 'bg-[#F1EBE9] text-[#6B4F4A]',
    developer: 'bg-purple-100 text-purple-700',
    editor: 'bg-purple-100 text-purple-700',
  }
  return <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${s[role.toLowerCase()] ?? 'bg-[#F1EBE9] text-[#6B4F4A]'}`}>{role}</span>
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, href, loading, tone }: {
  label: string; value: number | string; sub: string
  icon: any; href?: string; loading: boolean; tone: 'blue' | 'violet' | 'emerald' | 'amber'
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  }
  const inner = (
    <div className="group h-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_8px_30px_-24px_rgba(15,23,42,.35)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_36px_-24px_rgba(15,23,42,.35)]">
      <div className="mb-5 flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>
          <Icon size={22} />
        </div>
        {href && <ChevronRight size={19} className="text-slate-300 transition-colors group-hover:text-slate-600" />}
      </div>
      {loading
        ? <div className="mb-2 h-10 w-16 animate-pulse rounded-lg bg-slate-100" />
        : <p className="mb-2 text-4xl font-extrabold leading-none tracking-tight text-slate-950">{value}</p>
      }
      <p className="text-base font-bold text-slate-900">{label}</p>
      <p className="mt-0.5 text-sm text-slate-500">{sub}</p>
    </div>
  )
  return href ? <Link href={href} className="block h-full">{inner}</Link> : <div className="h-full">{inner}</div>
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function MiniProgress({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.max(value, 2)}%` }}
        />
      </div>
      <span className="w-9 text-right text-sm font-bold text-slate-600">{value}%</span>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
type DashboardHomeProps = {
  initialStats?: Stats | null
  initialPeople?: { admins: AdminUser[]; developers: DevUser[] } | null
  initialWikiHealth?: { wikis: WikiHealth[]; lessons: FlaggedLesson[] } | null
}

export default function DashboardHome({
  initialStats = null,
  initialPeople = null,
  initialWikiHealth = null,
}: DashboardHomeProps) {
  const [stats, setStats]     = useState<Stats | null>(initialStats)
  const [admins, setAdmins]   = useState<AdminUser[]>(initialPeople?.admins ?? [])
  const [devs, setDevs]       = useState<DevUser[]>(initialPeople?.developers ?? [])
  const [wikiHealth, setWikiHealth] = useState<WikiHealth[]>(initialWikiHealth?.wikis ?? [])
  const [flaggedLessons, setFlaggedLessons] = useState<FlaggedLesson[]>(initialWikiHealth?.lessons ?? [])

  const [loadingStats, setLoadingStats]   = useState(initialStats == null)
  const [loadingAdmins, setLoadingAdmins] = useState(initialPeople == null)
  const [loadingWikis, setLoadingWikis]   = useState(initialWikiHealth == null)
  const [refreshedAt, setRefreshedAt]     = useState<Date>(() => new Date())

  const [isSuperadmin, setIsSuperadmin] = useState(false)
  const [createOpen, setCreateOpen]     = useState(false)

  useEffect(() => {
    fetch('/api/developers/me', { headers: applyDeveloperHeader() as HeadersInit })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.developer?.role === 'superadmin') setIsSuperadmin(true)
      })
      .catch(() => {})
  }, [])

  const handleWikiCreated = async () => {
    window.location.reload()
  }

  const loadAll = useCallback(() => {
    setLoadingStats(true); setLoadingAdmins(true); setLoadingWikis(true)
    setRefreshedAt(new Date())

    fetch('/api/admin/stats').then(r => r.json()).then(d => {
      setStats(d); setLoadingStats(false)
    })
    fetch('/api/admin/admins').then(r => r.json()).then(d => {
      setAdmins(d.admins || []); setDevs(d.developers || []); setLoadingAdmins(false)
    })
    fetch('/api/admin/wiki-health').then(r => r.json()).then(d => {
      setWikiHealth(d.wikis || []); setFlaggedLessons(d.lessons || []); setLoadingWikis(false)
    })
  }, [])

  // Fetch on mount only when the server did NOT pre-load everything; otherwise
  // keep the server data. This pure guard (no "run once" ref) is idempotent
  // under React StrictMode's double-invoked mount effects — critical here
  // because the dev-mode APIs return empty stubs that would wipe real SSR data.
  // Refresh calls loadAll() directly, so it's unaffected.
  useEffect(() => {
    if (initialStats != null && initialPeople != null && initialWikiHealth != null) return
    loadAll()
    // initial* props are mount-stable (from a server component); only loadAll changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAll])

  const totalPeople = admins.length + devs.length
  const activeNow   = admins.filter(a => a.activeSessions > 0).length
  const totalEnrollments = wikiHealth.reduce((sum, wiki) => sum + wiki.enrolled, 0)
  const learnersInProgress = wikiHealth.reduce((sum, wiki) => sum + wiki.totalInProgress, 0)
  const averageCompletion = wikiHealth.length
    ? Math.round(wikiHealth.reduce((sum, wiki) => sum + wiki.avgCompletion, 0) / wikiHealth.length)
    : 0
  const healthyWikis = wikiHealth.filter((wiki) => wiki.avgCompletion >= 50).length

  const dayName  = refreshedAt.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr  = refreshedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const minAgo   = Math.floor((Date.now() - refreshedAt.getTime()) / 60000)
  const refreshLabel = minAgo < 1 ? 'just now' : `${minAgo} min ago`

  const allPeople = [
    ...admins.map(a => ({ id: a.id, name: a.name, email: a.email, avatarUrl: a.avatarUrl, role: 'admin', lastLoginAt: a.lastLoginAt, activeSessions: a.activeSessions })),
    ...devs.map(d => ({ id: d.id, name: d.name, email: d.email, avatarUrl: d.avatarUrl, role: d.role, lastLoginAt: null as string | null, activeSessions: 0 })),
  ]

  return (
    <div className={`${display.variable} rgx-dash dashboard-text-scale space-y-7 text-slate-950`}>

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">Overview</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Academy dashboard</h1>
          {/* Built from the current clock (new Date()/Date.now()), which differs
              between server render and client hydration — suppress the mismatch. */}
          <p className="text-base text-[#8B6B65]" suppressHydrationWarning>{dayName} · {dateStr} · last refresh {refreshLabel}</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button onClick={loadAll} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[15px] font-semibold text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900">
            <RefreshCw size={16} /> Refresh
          </button>
          {isSuperadmin && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F0523F] to-[#E23B2E] text-white text-[15px] font-bold shadow-lg shadow-[#E23B2E]/25 hover:-translate-y-0.5 transition-transform"
            >
              <Plus size={17} /> New wiki
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active teachers" value={stats?.teachers ?? 0} sub="total registered"
          icon={GraduationCap} loading={loadingStats} href="/dashboard/teachers" tone="blue" />
        <StatCard label="Total students" value={stats?.students ?? 0} sub="enrolled across all wikis"
          icon={Users} loading={loadingStats} href="/dashboard/students" tone="violet" />
        <StatCard label="Published wikis" value={stats?.wikis ?? 0} sub="live this month"
          icon={BookOpen} loading={loadingStats} tone="emerald" />
        <StatCard label="Admin sessions" value={stats?.activeSessions ?? 0} sub="currently active"
          icon={Activity} loading={loadingStats} tone="amber" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-[0_18px_44px_-30px_rgba(15,23,42,.75)]">
        <div className="grid lg:grid-cols-[1.2fr_3fr]">
          <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/40">Learning pulse</p>
            <h2 className="mt-2 text-2xl font-extrabold">How the academy is moving</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">Participation and content-health signals across published wikis.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <div className="border-b border-r border-white/10 p-5 sm:border-b-0"><p className="text-3xl font-extrabold">{averageCompletion}%</p><p className="mt-1 text-sm text-white/50">Average completion</p></div>
            <div className="border-b border-white/10 p-5 sm:border-b-0 sm:border-r"><p className="text-3xl font-extrabold">{totalEnrollments}</p><p className="mt-1 text-sm text-white/50">Wiki enrollments</p></div>
            <div className="border-r border-white/10 p-5"><p className="text-3xl font-extrabold">{learnersInProgress}</p><p className="mt-1 text-sm text-white/50">Learning now</p></div>
            <div className="p-5"><p className="text-3xl font-extrabold">{healthyWikis}<span className="text-lg text-white/35">/{wikiHealth.length}</span></p><p className="mt-1 text-sm text-white/50">Wikis above 50%</p></div>
          </div>
        </div>
      </section>

      {/* Bottom: two columns */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">

        {/* Left: Admins & editors */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:col-span-3">
          <div className="px-6 py-5 border-b border-[#F3E7E4] flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#1A1110]">Admins &amp; editors</h2>
              <p className="text-base text-[#8B6B65] mt-0.5">{totalPeople} people · {activeNow} active this hour</p>
            </div>
            <Link href="/dashboard/teachers?invite=1" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#EBD9D5] text-[15px] font-semibold text-[#6B4F4A] hover:bg-[#FBF3F1]">
              <UserPlus size={16} /> Invite
            </Link>
          </div>
          {loadingAdmins
            ? <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#F7EFED] rounded-xl animate-pulse" />)}</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="border-b border-[#F3E7E4]">
                      <th className="px-6 py-3 text-left text-[13px] font-bold text-[#B08981] uppercase tracking-wide">Person</th>
                      <th className="px-4 py-3 text-left text-[13px] font-bold text-[#B08981] uppercase tracking-wide">Role</th>
                      <th className="px-4 py-3 text-left text-[13px] font-bold text-[#B08981] uppercase tracking-wide">Last seen</th>
                      <th className="px-4 py-3 text-left text-[13px] font-bold text-[#B08981] uppercase tracking-wide">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPeople.map(p => (
                      <tr key={p.id} className="border-b border-[#F6EEEC] last:border-0 hover:bg-[#FCF6F5] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`relative w-10 h-10 overflow-hidden rounded-xl bg-gradient-to-br ${avatarColor(p.id)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                              {p.avatarUrl ? (
                                <img src={p.avatarUrl} alt={p.name || p.email} className="h-full w-full object-cover" />
                              ) : (
                                initials(p.name, p.email)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[15px] font-bold text-[#1A1110] truncate">{p.name || '—'}</p>
                              <p className="text-sm text-[#8B6B65] truncate">{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4"><RoleBadge role={p.role} /></td>
                        <td className="px-4 py-4 text-[15px] text-[#8B6B65] whitespace-nowrap" suppressHydrationWarning>{timeAgo(p.lastLoginAt)}</td>
                        <td className="px-4 py-4">
                          {p.activeSessions > 0
                            ? <span className="flex items-center gap-1.5 text-[15px] font-bold text-[#1A1110]">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />{p.activeSessions}
                              </span>
                            : <span className="text-[15px] text-[#C6A39C]">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>

        {/* Right: Wiki health + needs attention */}
        <div className="xl:col-span-2 space-y-6">

          {/* Wiki overview */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="px-6 py-5 border-b border-[#F3E7E4] flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#1A1110]">Wiki overview</h3>
              <Link href="/editor" className="text-[15px] font-semibold text-[#B08981] hover:text-[#E23B2E] transition-colors">Manage →</Link>
            </div>
            {loadingWikis
              ? <div className="p-6 space-y-2.5">{[1,2,3].map(i => <div key={i} className="h-9 bg-[#F7EFED] rounded-lg animate-pulse" />)}</div>
              : wikiHealth.length === 0
                ? <p className="px-6 py-6 text-base text-[#8B6B65]">No published wikis yet.</p>
                : (
                  <div className="divide-y divide-[#F6EEEC]">
                    {wikiHealth.map(w => (
                      <div key={w.slug} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[#FCF6F5] transition-colors">
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold text-[#1A1110] truncate">{w.name}</p>
                          <p className="text-sm text-[#8B6B65]">{w.totalLessons} lesson{w.totalLessons !== 1 ? 's' : ''}</p>
                        </div>
                        <MiniProgress value={w.avgCompletion} />
                      </div>
                    ))}
                  </div>
                )
            }
          </div>

          {/* Wiki categories */}
          <CategoriesCard />

          {/* Needs attention — flagged lessons */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="px-6 py-5 border-b border-[#F3E7E4] flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#1A1110]">Needs attention</h3>
              {!loadingWikis && flaggedLessons.length > 0 && (
                <span className="text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                  {flaggedLessons.length} lesson{flaggedLessons.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {loadingWikis
              ? <div className="p-6 space-y-2.5">{[1,2,3].map(i => <div key={i} className="h-9 bg-[#F7EFED] rounded-lg animate-pulse" />)}</div>
              : flaggedLessons.length === 0
                ? (
                  <div className="px-6 py-7 flex items-center gap-3 text-base text-[#8B6B65]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                    No pending lesson changes
                  </div>
                )
                : (
                  <div className="divide-y divide-[#F6EEEC] max-h-80 overflow-y-auto">
                    {flaggedLessons.map(l => (
                      <div key={l.id} className="px-6 py-4 flex items-center gap-3">
                        <span className={`shrink-0 px-2 py-1 rounded-lg text-sm font-bold whitespace-nowrap ${
                          l.status === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          l.status === 'draft'     ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                     'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {l.status === 'published' ? 'published' : l.status === 'draft' ? 'changed' : 'unpublished'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold text-[#1A1110] truncate">{l.title}</p>
                          <p className="text-sm text-[#8B6B65] truncate">{l.wikiName}</p>
                        </div>
                        <p className="text-sm text-[#B08981] shrink-0" suppressHydrationWarning>{timeAgo(l.updatedAt)}</p>
                      </div>
                    ))}
                  </div>
                )
            }
          </div>

        </div>
      </div>

      {isSuperadmin && (
        <CreateWikiModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleWikiCreated}
        />
      )}
    </div>
  )
}
