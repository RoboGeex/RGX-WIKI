"use client"

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Locale } from '../lib/i18n'
import type { Lesson } from '../lib/data'
import { isUnlocked, setStoredLocale } from '../lib/unlock'
import Navbar from './navbar'

interface Props {
  locale: Locale
  kitSlug: string
  lessons: Lesson[]
  defaultLessonSlug?: string
  resourcesUrl?: string
}

export default function KitNavbar({
  locale,
  kitSlug,
  lessons,
  defaultLessonSlug,
  resourcesUrl,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname.includes('/lesson/') && !isUnlocked()) {
      router.push('/unlock')
    }
  }, [pathname, router])

  const handleLocaleChange = (nextLocale: Locale) => {
    setStoredLocale(nextLocale)
    if (locale !== nextLocale) {
      const updated = pathname.replace(`/${locale}/`, `/${nextLocale}/`)
      router.push(updated)
    }
  }

  return (
    <Navbar
      locale={locale}
      kitSlug={kitSlug}
      lessons={lessons}
      defaultLessonSlug={defaultLessonSlug}
      resourcesUrl={resourcesUrl}
      onLocaleChange={handleLocaleChange}
      onMenuClick={() => {}}
    />
  )
}