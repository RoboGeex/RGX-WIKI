import type { LessonBodyItem } from '@/lib/data'
import type { Locale } from '@/lib/i18n'

interface StepProps {
  step: LessonBodyItem
  stepNumber: number
  locale: Locale
}

export default function Step({ step, stepNumber, locale }: StepProps) {
  const title = locale === 'ar' ? (step.title_ar || '') : (step.title_en || '')
  const text = locale === 'ar' ? (step.ar || '') : (step.en || '')
  return (
    <div className="rounded-xl border p-5 space-y-3">
      <h3 className="font-semibold flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
          {stepNumber}
        </span>
        {title}
      </h3>
      {text && (
        <p className="text-sm leading-relaxed">{text}</p>
      )}
      {step.image && (
        <div className="mt-4 rounded-xl overflow-hidden border bg-gray-50">
          <img src={step.image} alt={title || ''} className="w-full h-auto object-contain" />
        </div>
      )}
    </div>
  )
}
