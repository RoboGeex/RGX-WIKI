"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, BookOpen, ShieldCheck, GraduationCap, ChevronRight } from 'lucide-react'

type Stats = { teachers: number; students: number; wikis: number; activeSessions: number; admins: number; developerCount: number }
type AdminUser = { source: 'user'; id: string; email: string; name: string | null; disabledAt: string | null; createdAt: string; lastLoginAt: string | null; activeSessions: number }
type DevUser = { source: 'developer'; id: string; email: string; name: string | null; createdAt: string; role: string }

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function Initials({ name, email, color }: { name: string | null; email: string; color: string }) {
  return (
    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {(name || email)[0].toUpperCase()}
    </div>
  )
}

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [developers, setDevelopers] = useState<DevUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then(r => r.json()),
      fetch('/api/admin/admins').then(r => r.json()),
    ]).then(([s, a]) => {
      setStats(s)
      setAdmins(a.admins || [])
      setDevelopers(a.developers || [])
    }).finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Teachers', value: stats?.teachers ?? '—', icon: <GraduationCap size={18} />, href: '/dashboard/teachers' },
    { label: 'Students', value: stats?.students ?? '—', icon: <Users size={18} />, href: '/dashboard/students' },
    { label: 'Published wikis', value: stats?.wikis ?? '—', icon: <BookOpen size={18} />, href: null },
    { label: 'Active admin sessions', value: stats?.activeSessions ?? '—', icon: <ShieldCheck size={18} />, href: null },
  ]

  return (
    <div className="space-y-6">

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => {
          const inner = (
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:border-gray-300 transition-colors group">
              <div>
                <p className="text-3xl font-bold text-gray-900 leading-none mb-1">
                  {loading ? <span className="inline-block w-8 h-7 bg-gray-100 rounded animate-pulse align-middle" /> : c.value}
                </p>
                <p className="text-sm text-gray-500">{c.label}</p>
              </div>
              <div className="flex items-center gap-2 text-gray-300 group-hover:text-gray-400 transition-colors">
                {c.icon}
                {c.href && <ChevronRight size={15} />}
              </div>
            </div>
          )
          return c.href
            ? <Link key={c.label} href={c.href}>{inner}</Link>
            : <div key={c.label}>{inner}</div>
        })}
      </div>

      {/* Admins & editors */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Admins & editors</h2>
        </div>

        {loading && <p className="px-5 py-6 text-sm text-gray-400">Loading…</p>}

        {!loading && admins.length > 0 && (
          <div>
            <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Admin accounts</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 w-10">#</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400">Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400">Email</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400">Sessions</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400">Last login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map((a, i) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Initials name={a.name} email={a.email} color="bg-gray-700" />
                        <span className="text-sm font-medium text-gray-900">{a.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{a.email}</td>
                    <td className="px-5 py-3">
                      {a.activeSessions > 0
                        ? <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            {a.activeSessions} active
                          </span>
                        : <span className="text-sm text-gray-400">None</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{timeAgo(a.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && developers.length > 0 && (
          <div className={admins.length > 0 ? 'border-t border-gray-100' : ''}>
            <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Editors (legacy)</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 w-10">#</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400">Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400">Email</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400">Role</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {developers.map((d, i) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Initials name={d.name} email={d.email} color="bg-purple-600" />
                        <span className="text-sm font-medium text-gray-900">{d.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{d.email}</td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">{d.role}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && admins.length === 0 && developers.length === 0 && (
          <p className="px-5 py-6 text-sm text-gray-400">No accounts found.</p>
        )}
      </div>

    </div>
  )
}
