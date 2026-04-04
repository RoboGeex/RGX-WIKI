"use client"

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Locale } from '../lib/i18n'
import type { Lesson } from '../lib/types'
import { isUnlocked, setStoredLocale } from '../lib/unlock'
import Navbar from './navbar'
import Sidebar from './sidebar'

interface Props {
  locale: Locale
  kitSlug: string
  lessons: Lesson[]
  defaultLessonSlug?: string
  resourcesUrl?: string
  isHubDomain?: boolean
}

export default function KitNavbar({
  locale,
  kitSlug,
  lessons,
  defaultLessonSlug,
  resourcesUrl,
  isHubDomain = false,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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

  const handleLocaleChange = (nextLocale: Locale) => {
    setStoredLocale(nextLocale)
    if (locale !== nextLocale) {
      const updated = pathname.replace(`/${locale}/`, `/${nextLocale}/`)
      const query = searchParams?.toString()
      router.push(query ? `${updated}?${query}` : updated)
    }
  }

  return (
    <>
      <Navbar
        locale={locale}
        kitSlug={kitSlug}
        lessons={lessons}
        defaultLessonSlug={defaultLessonSlug}
        resourcesUrl={resourcesUrl}
        isHubDomain={isHubDomain}
        onLocaleChange={handleLocaleChange}
        onMenuClick={() => setIsSidebarOpen(true)}
      />
      <Sidebar
        locale={locale}
        kitSlug={kitSlug}
        isHubDomain={isHubDomain}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        lessons={lessons}
        className="!fixed top-0 left-0 h-screen w-80 z-[100] bg-white border-r lg:hidden shadow-xl"
        tocMaxLevel={2}
      />
    </>
  )
}

