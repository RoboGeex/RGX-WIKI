"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Cairo } from 'next/font/google'
import { Search, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'

const display = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-cairo' })

export type DashboardTab = 'overview' | 'students' | 'teachers'

interface AdminNavbarProps {
  userInitials?: string
  userAvatarUrl?: string | null
  userName?: string | null
  userEmail?: string | null
  // When provided (on the single-page dashboard), the Dashboard/Students/Teachers
  // tabs switch in-page client state instead of navigating — instant, no server
  // round-trip. Omitted elsewhere (e.g. the editor), where they stay real links.
  activeTab?: DashboardTab
  onSelectTab?: (tab: DashboardTab) => void
}

const NAV: { label: string; href: string; tab: DashboardTab | null; match: (p: string) => boolean }[] = [
  { label: 'Dashboard', href: '/dashboard', tab: 'overview', match: (p: string) => p === '/dashboard' },
  { label: 'Wikis',     href: '/editor', tab: null, match: (p: string) => p.startsWith('/editor') },
  { label: 'Students',  href: '/dashboard/students', tab: 'students', match: (p: string) => p.startsWith('/dashboard/students') },
  { label: 'Teachers',  href: '/dashboard/teachers', tab: 'teachers', match: (p: string) => p.startsWith('/dashboard/teachers') },
]

function getInitials(name: string | null | undefined, email: string | null | undefined, fallback: string) {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return fallback
}

export default function AdminNavbar({
  userInitials = 'AD',
  userAvatarUrl = null,
  userName = null,
  userEmail = null,
  activeTab,
  onSelectTab,
}: AdminNavbarProps) {
  const pathname = usePathname() ?? ''
  const tabMode = Boolean(onSelectTab)
  const [profile, setProfile] = useState<{ name: string | null; email: string | null; avatarUrl: string | null } | null>(null)

  useEffect(() => {
    if (userName || userEmail || userAvatarUrl) return
    let cancelled = false
    fetch('/api/admin/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.account) {
          setProfile({
            name: data.account.name ?? null,
            email: data.account.email ?? null,
            avatarUrl: data.account.avatarUrl ?? null,
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userAvatarUrl, userEmail, userName])

  const displayName = userName ?? profile?.name ?? null
  const displayEmail = userEmail ?? profile?.email ?? null
  const displayAvatarUrl = userAvatarUrl ?? profile?.avatarUrl ?? null
  const displayInitials = getInitials(displayName, displayEmail, userInitials)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <nav className={`${display.variable} rgx-dash bg-[#1A1110] fixed top-0 left-0 right-0 z-40 border-b border-black/30`}>
      <div className="w-full px-6 h-[72px] flex items-center gap-5">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-1">
          <Image
            src="/images/robogeex-logo.png"
            alt="RoboGeex Academy"
            width={160}
            height={45}
            priority
            className="h-12 w-auto"
          />
        </Link>

        {/* Nav tabs */}
        <div className="flex items-center gap-1">
          {NAV.map(item => {
            const active = tabMode && item.tab ? activeTab === item.tab : item.match(pathname)
            const className = `px-4 py-2 rounded-xl text-[15px] font-semibold transition-colors whitespace-nowrap ${
              active
                ? 'bg-gradient-to-r from-[#F0523F] to-[#E23B2E] text-white shadow-lg shadow-[#E23B2E]/25'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`
            // In tab mode, dashboard tabs switch in-page state instantly.
            if (tabMode && item.tab) {
              return (
                <button key={item.label} type="button" onClick={() => onSelectTab!(item.tab!)} className={className}>
                  {item.label}
                </button>
              )
            }
            return (
              <Link key={item.label} href={item.href} className={className}>
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 text-[15px] text-white/50 cursor-pointer hover:border-white/30 transition-colors">
            <Search size={15} />
            <span>Search</span>
            <kbd className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded ml-1">⌘K</kbd>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 text-[15px] font-semibold transition-colors"
          >
            <LogOut size={17} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
          <Link
            href="/dashboard/profile"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] text-sm font-bold text-white shadow-lg shadow-[#E23B2E]/20 ring-1 ring-white/10 transition hover:scale-[1.03] hover:ring-white/30"
            title={displayName || displayEmail || 'Admin profile'}
            aria-label="Admin profile"
          >
            {displayAvatarUrl ? (
              <Image src={displayAvatarUrl} alt={displayName || displayEmail || 'Admin profile'} fill sizes="40px" className="object-cover" />
            ) : (
              displayInitials
            )}
          </Link>
        </div>

      </div>
    </nav>
  )
}
