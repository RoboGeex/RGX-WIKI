"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Locale } from '@/lib/i18n'

type TocEntry = {
  id: string
  text: string
  level: number
}

export interface LessonTocProps {
  entries: TocEntry[]
  lessonTitle?: string
  locale?: Locale
}

export default function LessonToc({ entries, lessonTitle, locale = 'en' }: LessonTocProps) {
  const isArabic = locale === 'ar'
  const [activeId, setActiveId] = useState<string>('')
  const [discoveredEntries, setDiscoveredEntries] = useState<TocEntry[]>([])
  const clickLockRef = useRef<string | null>(null)
  const clickLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const baseEntries = useMemo(() => (entries.length > 0 ? entries : discoveredEntries), [entries, discoveredEntries])
  const tocEntries = useMemo(() => baseEntries.filter((entry) => entry.level === 1), [baseEntries])

  useEffect(() => {
    if (entries.length > 0) return

    const headingNodes = Array.from(document.querySelectorAll('[data-toc]')) as HTMLElement[]
    if (headingNodes.length) {
      const domEntries = headingNodes.map((node) => ({
        id: node.id,
        text: node.getAttribute('data-toc-text') || node.innerText || node.id,
        level: Number(node.getAttribute('data-level') || '2'),
      }))
      setDiscoveredEntries(domEntries)
    }
  }, [entries.length])

  useEffect(() => {
    const headingElements = tocEntries.map(entry => document.getElementById(entry.id)).filter(el => el !== null) as HTMLElement[];
    if (headingElements.length === 0) return;

    let throttleTimer: ReturnType<typeof setTimeout> | undefined;

    const handleScroll = () => {
      // If a click lock is active, don't override the clicked heading
      if (clickLockRef.current) return;

      const activationLine = window.scrollY + 150;

      let currentHeadingId: string | undefined = undefined;

      for (const headingEl of headingElements) {
        if (headingEl.offsetTop < activationLine) {
          currentHeadingId = headingEl.id;
        } else {
          break;
        }
      }
      
      if (!currentHeadingId && headingElements.length > 0) {
          currentHeadingId = headingElements[0].id;
      }
      
      if (currentHeadingId) {
        setActiveId(currentHeadingId);
      }
    };
    
    const throttledScrollHandler = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        handleScroll();
        throttleTimer = undefined;
      }, 100);
    }

    window.addEventListener('scroll', throttledScrollHandler);
    
    handleScroll(); 

    return () => {
      window.removeEventListener('scroll', throttledScrollHandler);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [tocEntries]);


  const handleLinkClick = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      // Set the active heading immediately
      setActiveId(id)

      // Lock scroll-based highlighting so it doesn't override the click
      clickLockRef.current = id
      if (clickLockTimerRef.current) clearTimeout(clickLockTimerRef.current)
      clickLockTimerRef.current = setTimeout(() => {
        clickLockRef.current = null
      }, 1000)

      window.scrollTo({
        top: el.offsetTop - 100, 
        behavior: 'smooth'
      });
    }
  }

  return (
    <nav
      dir={isArabic ? 'rtl' : 'ltr'}
      className={`bg-white border border-gray-200 rounded-2xl p-5 shadow-sm sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar smooth-panel-scroll ${isArabic ? 'text-right' : 'text-left'}`}
    >
      {lessonTitle && (
        <div className={`rounded-2xl bg-primary/15 text-primary px-4 py-3 mb-4 space-y-1 ${isArabic ? 'text-right' : 'text-left'}`}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary/70">Lesson</div>
          <div className="text-sm font-semibold leading-snug text-primary">{lessonTitle}</div>
        </div>
      )}

      <div className="text-xs uppercase font-semibold tracking-wide text-gray-500 mb-3">In this lesson</div>
      {tocEntries.length === 0 && (
        <div className="text-xs text-gray-400">Headings will appear here as you add content.</div>
      )}
      <ul className="space-y-1">
        {tocEntries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => handleLinkClick(entry.id)}
              className={`block w-full rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                isArabic
                  ? (entry.level >= 4 ? 'text-right pr-8' : entry.level === 3 ? 'text-right pr-5' : 'text-right pr-3')
                  : (entry.level >= 4 ? 'text-left pl-8' : entry.level === 3 ? 'text-left pl-5' : 'text-left pl-3')
              } ${
                activeId === entry.id
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {entry.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
