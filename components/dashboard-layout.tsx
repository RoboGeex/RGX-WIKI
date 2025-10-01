"use client"

import { useEffect, useState } from 'react'
import DashboardNavbar from './dashboard-navbar'
import type { Locale } from '@/lib/i18n'
import { getStoredLocale } from '@/lib/unlock'

interface Props {
  children: React.ReactNode
  wikiSlug?: string
  kitSlug?: string
}

export default function DashboardLayout({ children, wikiSlug, kitSlug }: Props) {
  const [locale, setLocale] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Get locale from localStorage on client side
    const storedLocale = getStoredLocale()
    setLocale(storedLocale as Locale)
    setMounted(true)
  }, [])

  if (!mounted) {
    // Show loading state or default layout
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavbar locale="en" wikiSlug={wikiSlug} kitSlug={kitSlug} />
        <div className="pt-16">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavbar locale={locale} wikiSlug={wikiSlug} kitSlug={kitSlug} />
      <div className="pt-16">
        {children}
      </div>
    </div>
  )
}
