import type { LessonBodyItem } from '../lib/types'
import type { Locale } from '@/lib/i18n'
import { LessonImage } from '@/components/lesson/LessonMedia'

interface StepProps {
  step: LessonBodyItem
  stepNumber: number
  locale: Locale
}

export default function Step({ step, stepNumber, locale }: StepProps) {
  const title = locale === 'ar' ? (step.title_ar || '') : (step.title_en || '')
  const text = locale === 'ar' ? (step.ar || '') : (step.en || '')
  return (
    <div className="rounded-3xl border p-5 space-y-3 shadow-md bg-white">
      <h3 className="font-semibold flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
          {stepNumber}
        </span>
        {title}
      </h3>
      {(step.html_en || step.html_ar || text) && (
        <div 
          className="text-sm text-gray-700 leading-relaxed" 
          dangerouslySetInnerHTML={{ __html: locale === 'ar' ? (step.html_ar || text) : (step.html_en || text) }} 
        />
      )}
      {step.image && (
        <div className="mt-4 rounded-2xl overflow-hidden border bg-white shadow-sm">
          <LessonImage
            src={step.image}
            alt={title || ''}
            minHeightClassName="min-h-[10rem]"
            imgClassName="w-full h-auto object-cover"
          />
        </div>
      )}
    </div>
  )
}
