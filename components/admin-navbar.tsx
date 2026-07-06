"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Lexend } from 'next/font/google'
import { Search, LogOut } from 'lucide-react'

const display = Lexend({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-lexend' })

interface AdminNavbarProps {
  userInitials?: string
}

const NAV = [
  { label: 'Dashboard', href: '/dashboard', match: (p: string) => p === '/dashboard' },
  { label: 'Wikis',     href: '/editor',    match: (p: string) => p.startsWith('/editor') },
  { label: 'Students',  href: '/dashboard/students', match: (p: string) => p.startsWith('/dashboard/students') },
  { label: 'Teachers',  href: '/dashboard/teachers', match: (p: string) => p.startsWith('/dashboard/teachers') },
]

export default function AdminNavbar({ userInitials = 'AD' }: AdminNavbarProps) {
  const pathname = usePathname() ?? ''

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
            const active = item.match(pathname)
            return (
              <Link key={item.label} href={item.href}
                className={`px-4 py-2 rounded-xl text-[15px] font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-gradient-to-r from-[#F0523F] to-[#E23B2E] text-white shadow-lg shadow-[#E23B2E]/25'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}>
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
          <div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F0523F] to-[#E23B2E] flex items-center justify-center text-white text-sm font-bold shrink-0"
            title="Signed in"
          >
            {userInitials}
          </div>
        </div>

      </div>
    </nav>
  )
}
