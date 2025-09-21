"use client"

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Navbar from '@/components/navbar'
import Sidebar from '@/components/sidebar'
import type { Locale } from '@/lib/i18n'
import type { Lesson, Module } from '@/lib/data'
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

  useEffect(() => {
    if (pathname.includes('/lesson/') && !isUnlocked()) router.push('/unlock')
  }, [pathname, router])

  const handleLocaleChange = (l: Locale) => {
    setStoredLocale(l)
    router.push(pathname.replace(`/${locale}/`, `/${l}/`))
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col">
        <Navbar
          locale={locale}
          kitSlug={kitSlug}
          lessons={lessons}
          modules={modules}
          defaultLessonSlug={defaultLessonSlug}
          resourcesUrl={resourcesUrl}
          onLocaleChange={handleLocaleChange}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <div className="flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 gap-8">
          <Sidebar
            locale={locale}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <main className="flex-1 min-w-0 py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
