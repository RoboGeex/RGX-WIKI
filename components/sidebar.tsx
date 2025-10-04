'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import type { Module } from '@/lib/data'

interface Props {
  locale: Locale
  kitSlug: string
  isOpen: boolean
  onClose: () => void
  modules?: Module[]
  lessons?: any[]
}

interface TocItem {
  id: string
  text: string
  level: number
}

type LessonSummary = {
  slug: string
  title_en: string
  title_ar: string
  duration_min: number
}

export default function Sidebar({ locale, kitSlug, isOpen, onClose, modules: propModules, lessons }: Props) {
  const pathname = usePathname()
  const safeLocale: Locale = locale && (locale === 'en' || locale === 'ar') ? locale : 'en'
  const [modules, setModules] = useState<Module[]>([])
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeHeading, setActiveHeading] = useState<string>('')

  useEffect(() => {
    if (propModules) {
      setModules(propModules)
    } else if (lessons) {
      const simpleModule: Module = {
        id: 'lessons',
        order: 1,
        title_en: t('lessons', safeLocale),
        title_ar: t('lessons', safeLocale),
        summary_en: t('allLessons', safeLocale),
        summary_ar: t('allLessons', safeLocale)
      }
      setModules([simpleModule])
    }
  }, [propModules, lessons, safeLocale])

  useEffect(() => {
    const headingNodes = Array.from(document.querySelectorAll('[data-toc]')) as HTMLElement[]
    const mapped = headingNodes.map((node) => ({
      id: node.id,
      text: node.getAttribute('data-toc-text') || node.innerText || node.id,
      level: Number(node.getAttribute('data-level') || '2'),
    }))
    setToc(mapped)

    if (!headingNodes.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop)
        if (visible.length > 0) {
          setActiveHeading(visible[0].target.id)
        }
      },
      { rootMargin: '-120px 0px -80% 0px' }
    )

    headingNodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [pathname])

  const handleScrollTo = (id: string) => {
    setActiveHeading(id)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (isOpen) onClose()
  }

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/40 z-40 lg:hidden" />}
      <aside
        className={`fixed lg:static top-20 left-0 w-72 lg:w-64 h-[calc(100vh-5rem)] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-sm z-50 transform transition-transform lg:sticky lg:top-28 lg:h-auto lg:self-start ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="lg:hidden flex justify-end p-4">
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{t('lessons', safeLocale)}</div>
            <div className="space-y-3">
              {lessons && lessons.length > 0 ? (
                <div className="space-y-1">
                  {lessons.map((lesson) => {
                    const isActive = pathname?.includes(`/lesson/${lesson.slug}`)
                    return (
                      <a
                        key={lesson.slug}
                        href={`/${locale}/${kitSlug}/lesson/${lesson.slug}`}
                        className={`block rounded-md px-3 py-2 text-sm transition ${
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-700 hover:bg-primary/10 hover:text-primary'
                        }`}
                      >
                        <div className="font-medium">{locale === 'ar' ? lesson.title_ar : lesson.title_en}</div>
                        <div className="text-[11px] text-gray-500">{lesson.duration_min}m</div>
                      </a>
                    )
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-400">{t('noLessonsYet', safeLocale)}</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{t('onThisPage', safeLocale)}</div>
            <nav className="space-y-1">
              {toc.length === 0 && (
                <div className="text-xs text-gray-400">{t('noHeadingsYet', safeLocale)}</div>
              )}
              {toc.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleScrollTo(item.id)}
                  className={`block text-left w-full rounded-md px-3 py-2 text-sm transition ${item.level >= 4 ? 'pl-6 text-xs' : item.level === 3 ? 'pl-4' : ''} ${activeHeading === item.id ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 hover:bg-primary/10 hover:text-primary'}`}
                >
                  {item.text}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </aside>
    </>
  )
}
