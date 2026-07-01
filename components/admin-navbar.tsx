"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Search, Bell } from 'lucide-react'

interface AdminNavbarProps {
  userInitials?: string
}

const NAV = [
  { label: 'Dashboard', href: '/dashboard', match: (p: string) => p === '/dashboard' },
  { label: 'Wikis',     href: '/editor',    match: (p: string) => p.startsWith('/editor') },
  { label: 'Students',  href: '/dashboard/students', match: (p: string) => p.startsWith('/dashboard/students') },
  { label: 'Teachers',  href: '/dashboard/teachers', match: (p: string) => p.startsWith('/dashboard/teachers') },
  { label: 'Settings',  href: '/dashboard', match: () => false },
]

export default function AdminNavbar({ userInitials = 'AD' }: AdminNavbarProps) {
  const pathname = usePathname() ?? ''

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-40">
      <div className="w-full px-6 h-16 flex items-center gap-4">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-2">
          <Image
            src="/images/robogeex-logo.svg"
            alt="RoboGeex Academy"
            width={160}
            height={45}
            priority
            className="h-14 w-auto"
          />
        </Link>

        {/* Nav tabs */}
        <div className="flex items-center gap-0.5">
          {NAV.map(item => {
            const active = item.match(pathname)
            return (
              <Link key={item.label} href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}>
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-400 cursor-pointer hover:border-gray-300 transition-colors">
            <Search size={13} />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-1">⌘K</kbd>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <Bell size={17} />
          </button>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs font-bold shrink-0"
            title="Sign out"
          >
            {userInitials}
          </button>
        </div>

      </div>
    </nav>
  )
}
