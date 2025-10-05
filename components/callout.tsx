import type { LessonBodyItem } from '@/lib/types'
import type { Locale } from '@/lib/i18n'
import { Info, Lightbulb, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

export default function Callout({ callout, locale }: { callout: LessonBodyItem; locale: Locale }) {
  const map = {
    info: { icon: Info, cls: 'bg-blue-50 border-blue-200' },
    tip: { icon: Lightbulb, cls: 'bg-green-50 border-green-200' },
    warning: { icon: AlertTriangle, cls: 'bg-yellow-50 border-yellow-200' }
  }
  const variant = map[callout.variant || 'info']
  const Icon = variant.icon
  return (
    <div className={clsx('rounded-xl p-4 border flex gap-3 items-start', variant.cls)}>
      <Icon size={18} className="mt-0.5" />
      <p className="text-sm">{locale === 'ar' ? callout.ar : callout.en}</p>
    </div>
  )
}
