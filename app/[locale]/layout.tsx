'use client'

import { useEffect } from 'react'
import { isRTL, Locale } from '../../lib/i18n'

export default function LocaleLayout(
  { children, params }: { children: React.ReactNode; params: { locale: Locale } }
) {
  useEffect(() => {
    document.documentElement.setAttribute('lang', params.locale)
    document.documentElement.setAttribute('dir', isRTL(params.locale) ? 'rtl' : 'ltr')
  }, [params.locale])

  return <>{children}</>
}