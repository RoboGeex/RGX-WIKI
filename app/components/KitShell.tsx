"use client"

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/navbar'
import Sidebar from '@/components/sidebar'
import type { Locale } from '@/lib/i18n'
import type { Lesson, Module } from '@/lib/types'
import { isUnlocked, setStoredLocale } from '@/lib/unlock'

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
    if (isUnlocked(kitSlug)) return

    const search = new URLSearchParams({
      kit: kitSlug,
      redirect: pathname,
    })

    router.push(`/${locale}/unlock?${search.toString()}`)
  }, [pathname, router, locale, kitSlug])

  const handleLocaleChange = (l: Locale) => {
    setStoredLocale(l)
    const updated = pathname.replace(`/${locale}/`, `/${l}/`)
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
