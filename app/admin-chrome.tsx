"use client"

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AdminNavbar from '@/components/admin-navbar'

export default function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const isAdminRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname === '/editor' || pathname.startsWith('/editor/')
  const isStandaloneEditor = ['/editor/lesson', '/editor/properties', '/editor/segment', '/editor/resources'].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  useEffect(() => {
    if (!isAdminRoute) return
    router.prefetch('/dashboard')
    router.prefetch('/editor')
  }, [isAdminRoute, router])

  return (
    <>
      {isAdminRoute && <AdminNavbar sidebarMode />}
      {isStandaloneEditor ? <div className="pb-24 pt-[68px] lg:pl-[272px] lg:pb-0 lg:pt-0">{children}</div> : children}
    </>
  )
}
