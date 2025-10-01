import { Clock, Target, BookOpen, ShoppingCart, HelpCircle } from 'lucide-react'
import { Lesson } from '@/lib/data'
import { Locale, t } from '@/lib/i18n'

interface LessonMetaCardProps {
  lesson: Lesson
  locale: Locale
}

export default function LessonMetaCard({ lesson, locale }: LessonMetaCardProps) {
  // Ensure locale is valid, fallback to 'en'
  const safeLocale: Locale = locale && (locale === 'en' || locale === 'ar') ? locale : 'en'
  const prerequisites = safeLocale === 'ar' ? lesson.prerequisites_ar : lesson.prerequisites_en

  return (
    <div className="glass p-5 rounded-xl space-y-5">
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <Clock size={16} /> {lesson.duration_min} min
        </div>
        <div className="flex items-center gap-3">
          <Target size={16} /> {lesson.difficulty}
        </div>
      </div>

      {prerequisites.length > 0 && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <BookOpen size={16} />
            <span className="font-medium">{t('prerequisites', safeLocale)}</span>
          </div>
          <ul className="ml-5 list-disc space-y-1">
            {prerequisites.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm text-white transition hover:bg-blue-700">
          <ShoppingCart size={16} />
          <span>{t('buySpares', safeLocale)}</span>
        </button>
        <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition hover:bg-gray-50">
          <HelpCircle size={16} />
          <span>{t('getSupport', safeLocale)}</span>
        </button>
      </div>
    </div>
  )
}