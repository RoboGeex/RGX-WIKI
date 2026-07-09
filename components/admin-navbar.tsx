"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Cairo } from 'next/font/google'
import { Search, LogOut, GraduationCap, Users, BookOpen, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AdminSearchResult } from '@/app/api/admin/search/route'

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

const CATEGORY_META = {
  student: { label: 'Students', icon: GraduationCap },
  teacher: { label: 'Teachers', icon: Users },
  wiki: { label: 'Wikis', icon: BookOpen },
} as const

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

// Quick-search over students/teachers/wikis, backed by /api/admin/search.
// Shared by every admin dashboard via AdminNavbar, so it works the same on
// the overview, students, teachers, and wikis screens.
function AdminSearch() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // ⌘K / Ctrl+K focuses and opens the search from anywhere on the page.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Close on outside click.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  // Debounced fetch against the admin search API.
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const handle = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => (res.ok ? res.json() : { results: [] }))
        .then((data) => {
          setResults(Array.isArray(data.results) ? data.results : [])
          setActiveIndex(0)
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  function navigateTo(result: AdminSearchResult) {
    setOpen(false)
    setQuery('')
    setResults([])
    router.push(result.href)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = results[activeIndex]
      if (target) navigateTo(target)
    }
  }

  const showDropdown = open && query.trim().length > 0
  const grouped = (['student', 'teacher', 'wiki'] as const)
    .map((category) => ({ category, items: results.filter((r) => r.category === category) }))
    .filter((g) => g.items.length > 0)

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/15 text-[15px] text-white/70 focus-within:border-white/30 transition-colors">
        <Search size={15} className="shrink-0 text-white/50" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search"
          className="w-36 bg-transparent text-[15px] text-white placeholder:text-white/50 outline-none"
        />
        {!query && <kbd className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded ml-1 shrink-0">⌘K</kbd>}
      </div>

      {showDropdown && (
        <div className="animate-menu-in absolute right-0 top-full z-50 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.45)]">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-4 text-sm text-slate-500">No matches for "{query}"</div>
          )}
          {!loading && grouped.map(({ category, items }) => {
            const meta = CATEGORY_META[category]
            const Icon = meta.icon
            return (
              <div key={category} className="mb-1 last:mb-0">
                <div className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <Icon size={12} /> {meta.label}
                </div>
                {items.map((item) => {
                  const globalIndex = results.indexOf(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item)}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      className={`flex w-full flex-col items-start rounded-xl px-3 py-2 text-left transition-colors ${
                        activeIndex === globalIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate text-sm font-semibold text-slate-900">{item.title}</span>
                      <span className="truncate text-xs text-slate-500">{item.subtitle}</span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
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
          <AdminSearch />
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
