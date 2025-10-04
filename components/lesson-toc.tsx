"use client"

import { useEffect, useMemo, useState } from 'react'

type TocEntry = {
  id: string
  text: string
  level: number
}

export interface LessonTocProps {
  entries: TocEntry[]
  lessonTitle?: string
}

export default function LessonToc({ entries, lessonTitle }: LessonTocProps) {
  const [activeId, setActiveId] = useState<string>('')
  const [discoveredEntries, setDiscoveredEntries] = useState<TocEntry[]>([])

  const tocEntries = useMemo(() => (entries.length > 0 ? entries : discoveredEntries), [entries, discoveredEntries])

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
      
      if (currentHeadingId && currentHeadingId !== activeId) {
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
  }, [tocEntries, activeId]);


  const handleLinkClick = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      setActiveId(id)
      window.scrollTo({
        top: el.offsetTop - 100, 
        behavior: 'smooth'
      });
    }
  }

  return (
    <nav className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm sticky top-24">
      {lessonTitle && (
        <div className="rounded-2xl bg-primary/15 text-primary px-4 py-3 mb-4 space-y-1">
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
              className={`block w-full text-left rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                entry.level >= 4 ? 'pl-8' : entry.level === 3 ? 'pl-5' : 'pl-3'
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
