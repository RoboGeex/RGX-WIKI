'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { isRTL, Locale } from '@/lib/i18n'

export default function LocaleLayout(
  { children, params }: { children: React.ReactNode; params: { locale: Locale } }
) {
  const pathname = usePathname()

  useEffect(() => {
    document.documentElement.setAttribute('lang', params.locale)
    document.documentElement.setAttribute('dir', isRTL(params.locale) ? 'rtl' : 'ltr')
  }, [params.locale])

  // Keying by pathname remounts the wrapper on every lesson navigation so the
  // page fade replays (template.tsx would do this, but Turbopack 14.0.4 can't
  // compile nested templates). Opacity-only — fixed navbars are unaffected.
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  )
}