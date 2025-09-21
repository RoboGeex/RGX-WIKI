"use client"
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Locale } from '@/lib/i18n'

interface Props {
  locale: Locale
  isOpen: boolean
  onClose: () => void
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

type ModuleSummary = {
  id: string
  title_en: string
  title_ar: string
  lessons: LessonSummary[]
}

export default function Sidebar({ locale, isOpen, onClose }: Props) {
  const [modules, setModules] = useState<ModuleSummary[]>([])
  const [toc, setToc] = useState<TocItem[]>([])
  const [activeHeading, setActiveHeading] = useState<string>('')

  useEffect(() => {
    const summaryElement = document.getElementById('lesson-summary-data')
    if (!summaryElement) return
    try {
      const parsed = JSON.parse(summaryElement.getAttribute('data-summary') || '[]') as ModuleSummary[]
      setModules(parsed)
    } catch (error) {
      console.error('Failed to parse lesson summary', error)
    }
  }, [])

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
      { rootMargin: '-60% 0px -30% 0px', threshold: 0 }
    )

    headingNodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [typeof window !== 'undefined' ? window.location.pathname : ''])

  const handleScrollTo = (id: string) => {
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
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Lessons</div>
            <div className="space-y-3">
              {modules.map((module) => (
                <div key={module.id} className="space-y-2">
                  <div className="text-sm font-semibold text-gray-700">
                    {locale === 'ar' ? module.title_ar : module.title_en}
                  </div>
                  <div className="space-y-1">
                    {module.lessons.map((lesson) => (
                      <a
                        key={lesson.slug}
                        href={`/${locale}/${lesson.slug.includes('/lesson/') ? lesson.slug : `${lesson.slug}`}`}
                        className="block rounded-md px-3 py-2 text-sm hover:bg-primary/10 hover:text-primary transition"
                      >
                        <div className="font-medium">{locale === 'ar' ? lesson.title_ar : lesson.title_en}</div>
                        <div className="text-[11px] text-gray-500">{lesson.duration_min}m</div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">On this page</div>
            <nav className="space-y-1">
              {toc.length === 0 && (
                <div className="text-xs text-gray-400">No headings yet.</div>
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
