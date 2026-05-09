"use client"

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/navbar'
import Sidebar from '@/components/sidebar'
import type { Locale } from '@/lib/i18n'
import type { Lesson, Module } from '@/lib/types'
import { isUnlocked, setUnlocked, setStoredLocale } from '@/lib/unlock'

interface Props {
  locale: Locale
  kitSlug: string
  modules: Module[]
  lessons: Lesson[]
  defaultLessonSlug?: string
  resourcesUrl?: string
  children: React.ReactNode
}

export default function KitShell({ locale, kitSlug, modules, lessons, defaultLessonSlug, resourcesUrl, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    if (!pathname.includes('/lesson/')) return
    if (pathname.includes('/unlock')) return

    const redirectToUnlock = () => {
      const search = new URLSearchParams({ kit: kitSlug, redirect: pathname })
      router.push(`/${locale}/unlock?${search.toString()}`)
    }

    // Fast local check — redirect immediately if nothing stored at all
    if (!isUnlocked(kitSlug)) {
      redirectToUnlock()
      return
    }

    // Re-validate stored code against the server so a deleted/changed code
    // is caught even when the layout hasn't re-rendered (client-side nav).
    fetch(`/api/validate-access?kit=${encodeURIComponent(kitSlug)}`)
      .then((res) => res.json())
      .then((data: { valid?: boolean }) => {
        if (!data.valid) {
          setUnlocked(false, kitSlug)
          redirectToUnlock()
        }
      })
      .catch(() => {
        // Network/server error — don't lock out, let the server-side layout handle it
      })
  }, [pathname, router, locale, kitSlug])

  const handleLocaleChange = (l: Locale) => {
    setStoredLocale(l)
    const currentPath = pathname ?? `/${locale}`
    const updated =
      currentPath === `/${locale}`
        ? `/${l}`
        : currentPath.startsWith(`/${locale}/`)
          ? currentPath.replace(`/${locale}/`, `/${l}/`)
          : currentPath
    const query = searchParams?.toString()
    router.push(query ? `${updated}?${query}` : updated)
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col">
        <Navbar
          locale={locale}
          kitSlug={kitSlug}
          lessons={lessons}
          defaultLessonSlug={defaultLessonSlug}
          resourcesUrl={resourcesUrl}
          isHubDomain={false}
          onLocaleChange={handleLocaleChange}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <div className="flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 gap-8">
          <Sidebar
            locale={locale}
            kitSlug={kitSlug}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            modules={modules}
            lessons={lessons}
          />
          <main className="flex-1 min-w-0 pt-2 pb-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
