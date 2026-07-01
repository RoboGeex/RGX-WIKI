"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronRight, Filter, UserPlus } from 'lucide-react'
import CategoriesCard from './CategoriesCard'
import CreateWikiModal from '@/components/create-wiki-modal'
import { applyDeveloperHeader } from '@/components/editor/dev-identity'

type Stats = { teachers: number; students: number; wikis: number; activeSessions: number }
type AdminUser = {
  source: 'user'; id: string; email: string; name: string | null
  disabledAt: string | null; createdAt: string; lastLoginAt: string | null; activeSessions: number
}
type DevUser = { source: 'developer'; id: string; email: string; name: string | null; createdAt: string; role: string }
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
  return days < 30 ? `${days}d ago` : new Date(d).toLocaleDateString()
}

function initials(name: string | null, email: string) {
  if (name) {
    const p = name.trim().split(/\s+/)
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const COLORS = ['bg-orange-500','bg-blue-500','bg-emerald-500','bg-purple-500','bg-rose-500','bg-amber-500','bg-teal-500','bg-indigo-500']
function avatarColor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff
  return COLORS[h % COLORS.length]
}

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const W = 80, H = 32
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 4) - 2,
  }))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg width={W} height={H} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const s: Record<string, string> = {
    owner: 'border border-orange-300 text-orange-600 bg-orange-50',
    superadmin: 'bg-blue-100 text-blue-700',
    admin: 'bg-gray-100 text-gray-600',
    developer: 'bg-purple-100 text-purple-700',
    editor: 'bg-purple-100 text-purple-700',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s[role.toLowerCase()] ?? 'bg-gray-100 text-gray-600'}`}>{role}</span>
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, deltaUp, sparkData, href, loading }: {
  label: string; value: number | string; sub: string
  deltaUp?: boolean; sparkData: number[]; href?: string; loading: boolean
}) {
  const sparkColor = deltaUp === undefined ? '#94a3b8' : deltaUp ? '#10b981' : '#ef4444'
  const inner = (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors group cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <div className="flex items-end justify-between">
        <div>
          {loading
            ? <div className="h-9 w-12 bg-gray-100 rounded animate-pulse mb-1" />
            : <p className="text-4xl font-bold text-gray-900 leading-none mb-1">{value}</p>
          }
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
        <div className="flex items-end gap-1">
          <Sparkline values={sparkData} color={sparkColor} />
          {href && <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors mb-1" />}
        </div>
      </div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>
}

// ── Progress bar ─────────────────────────────────────────────────────────────
function MiniProgress({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-7 text-right">{value}%</span>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardHome() {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [admins, setAdmins]   = useState<AdminUser[]>([])
  const [devs, setDevs]       = useState<DevUser[]>([])
  const [wikiHealth, setWikiHealth] = useState<WikiHealth[]>([])
  const [flaggedLessons, setFlaggedLessons] = useState<FlaggedLesson[]>([])

  const [loadingStats, setLoadingStats]   = useState(true)
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [loadingWikis, setLoadingWikis]   = useState(true)
  const [refreshedAt, setRefreshedAt]     = useState<Date>(new Date())

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

  useEffect(() => { loadAll() }, [loadAll])

  const totalPeople = admins.length + devs.length
  const activeNow   = admins.filter(a => a.activeSessions > 0).length

  const dayName  = refreshedAt.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr  = refreshedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const minAgo   = Math.floor((Date.now() - refreshedAt.getTime()) / 60000)
  const refreshLabel = minAgo < 1 ? 'just now' : `${minAgo} min ago`

  const allPeople = [
    ...admins.map(a => ({ id: a.id, name: a.name, email: a.email, role: 'admin', lastLoginAt: a.lastLoginAt, activeSessions: a.activeSessions })),
    ...devs.map(d => ({ id: d.id, name: d.name, email: d.email, role: d.role, lastLoginAt: null as string | null, activeSessions: 0 })),
  ]

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />All systems
            </span>
          </div>
          <p className="text-sm text-gray-400">{dayName} · {dateStr} · last refresh {refreshLabel}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={loadAll} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            ↻ Refresh
          </button>
          {isSuperadmin && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + New wiki
            </button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active teachers" value={stats?.teachers ?? 0} sub="total registered"
          sparkData={[1,1,2,1,1,1,stats?.teachers ?? 1]} loading={loadingStats} href="/dashboard/teachers" />
        <StatCard label="Total students" value={stats?.students ?? 0} sub="enrolled across all wikis"
          sparkData={[0,5,8,12,10,15,stats?.students ?? 0]} deltaUp={true} loading={loadingStats} href="/dashboard/students" />
        <StatCard label="Published wikis" value={stats?.wikis ?? 0} sub="this month"
          sparkData={[8,9,9,10,11,12,stats?.wikis ?? 0]} deltaUp={true} loading={loadingStats} />
        <StatCard label="Admin sessions" value={stats?.activeSessions ?? 0} sub="currently active"
          sparkData={[3,2,4,3,2,3,stats?.activeSessions ?? 0]} loading={loadingStats} />
      </div>

      {/* Bottom: two columns */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* Left: Admins & editors */}
        <div className="xl:col-span-3 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Admins &amp; editors</h2>
              <p className="text-sm text-gray-400 mt-0.5">{totalPeople} people · {activeNow} active in the last hour</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                <Filter size={13} /> Filter
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                <UserPlus size={13} /> Invite
              </button>
            </div>
          </div>
          {loadingAdmins
            ? <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />)}</div>
            : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Person</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Last seen</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Sessions</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allPeople.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${avatarColor(p.id)} flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                            {initials(p.name, p.email)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.name || '—'}</p>
                            <p className="text-xs text-gray-400">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3"><RoleBadge role={p.role} /></td>
                      <td className="px-5 py-3 text-sm text-gray-500">{timeAgo(p.lastLoginAt)}</td>
                      <td className="px-5 py-3">
                        {p.activeSessions > 0
                          ? <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{p.activeSessions}
                            </span>
                          : <span className="text-sm text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-3 py-3">
                        <ChevronRight size={15} className="text-gray-200 group-hover:text-gray-400 transition-colors" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>

        {/* Right: Wiki health + needs attention */}
        <div className="xl:col-span-2 space-y-4">

          {/* Wiki overview */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Wiki overview</h3>
              <Link href="/editor" className="text-xs text-gray-400 hover:text-gray-700">Manage →</Link>
            </div>
            {loadingWikis
              ? <div className="p-5 space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />)}</div>
              : wikiHealth.length === 0
                ? <p className="px-5 py-4 text-sm text-gray-400">No published wikis yet.</p>
                : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Wiki</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Lessons</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Avg completion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {wikiHealth.map(w => (
                        <tr key={w.slug} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{w.name}</p>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{w.totalLessons}</td>
                          <td className="px-4 py-3">
                            <MiniProgress value={w.avgCompletion} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
            }
          </div>

          {/* Wiki categories */}
          <CategoriesCard />

          {/* Needs attention — flagged lessons */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Needs attention</h3>
              {!loadingWikis && flaggedLessons.length > 0 && (
                <span className="text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
                  {flaggedLessons.length} lesson{flaggedLessons.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {loadingWikis
              ? <div className="p-5 space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />)}</div>
              : flaggedLessons.length === 0
                ? (
                  <div className="px-5 py-6 flex items-center gap-3 text-sm text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
                    No pending lesson changes
                  </div>
                )
                : (
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {flaggedLessons.map(l => (
                      <div key={l.id} className="px-5 py-3 flex items-center gap-3">
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                          l.status === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          l.status === 'draft'     ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                                     'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {l.status === 'published' ? 'published' : l.status === 'draft' ? 'changed' : 'unpublished'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{l.title}</p>
                          <p className="text-xs text-gray-400 truncate">{l.wikiName}</p>
                        </div>
                        <p className="text-xs text-gray-400 shrink-0">{timeAgo(l.updatedAt)}</p>
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
