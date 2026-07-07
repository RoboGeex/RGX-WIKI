"use client"

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Locale } from '../lib/i18n'
import type { Lesson } from '../lib/types'
import { setStoredLocale } from '../lib/unlock'
import Navbar from './navbar'
import Sidebar from './sidebar'

interface Props {
  locale: Locale
  kitSlug: string
  lessons: Lesson[]
  defaultLessonSlug?: string
  resourcesUrl?: string
  isHubDomain?: boolean
  showStudentDashboardLink?: boolean
}

export default function KitNavbar({
  locale,
  kitSlug,
  lessons,
  defaultLessonSlug,
  resourcesUrl,
  isHubDomain = false,
  showStudentDashboardLink = false,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Access control is enforced server-side in KitLayout (app/[locale]/[kit]/layout.tsx),
  // which is force-dynamic and re-runs on every navigation. It gates on the access
  // code AND correctly grants access to logged-in admins, assigned teachers, and
  // enrolled students. We must NOT re-check "unlocked" here: this client component
  // only knows about the access-code cookie/localStorage, so it would bounce
  // legitimately-authorized logged-in users to /unlock in an endless loop.

  const handleLocaleChange = (nextLocale: Locale) => {
    setStoredLocale(nextLocale)
    if (locale !== nextLocale) {
      const currentPath = pathname ?? `/${locale}`
      const parts = currentPath.split('/').filter(Boolean)
      const localeIndex = parts.findIndex((part) => part === 'en' || part === 'ar')
      const updated =
        localeIndex >= 0
          ? `/${parts.map((part, index) => (index === localeIndex ? nextLocale : part)).join('/')}`
          : currentPath === '/'
            ? `/${nextLocale}`
            : `/${nextLocale}${currentPath.startsWith('/') ? currentPath : `/${currentPath}`}`
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
        showStudentDashboardLink={showStudentDashboardLink}
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
