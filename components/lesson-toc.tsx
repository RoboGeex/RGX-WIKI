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
  const [tocEntries, setTocEntries] = useState<TocEntry[]>(entries)

  useEffect(() => {
    setTocEntries(entries)
  }, [entries])

  useEffect(() => {
    const headingNodes = Array.from(document.querySelectorAll('[data-toc]')) as HTMLElement[]

    if (headingNodes.length) {
      const domEntries = headingNodes.map((node) => ({
        id: node.id,
        text: node.getAttribute('data-toc-text') || node.innerText || node.id,
        level: Number(node.getAttribute('data-level') || '2'),
      }))
      setTocEntries(domEntries)
    }

    if (!headingNodes.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop)

        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
          return
        }

        const sorted = headingNodes.slice().sort((a, b) => a.offsetTop - b.offsetTop)
        const scrollTop = window.scrollY + window.innerHeight * 0.2
        const before = sorted.filter((node) => node.offsetTop <= scrollTop)
        if (before.length > 0) {
          const candidate = before[before.length - 1]
          if (candidate.id !== activeId) setActiveId(candidate.id)
        } else if (sorted.length > 0) {
          const candidate = sorted[0]
          if (candidate.id !== activeId) setActiveId(candidate.id)
        }
      },
      { rootMargin: '-60% 0px -30% 0px', threshold: 0 }
    )

    headingNodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [entries, activeId])

  const handleScroll = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
    }
  }

  const renderedToc = useMemo(() => tocEntries, [tocEntries])

  useEffect(() => {
    if (!activeId && tocEntries.length > 0) {
      setActiveId(tocEntries[0].id)
    }
  }, [activeId, tocEntries])

  return (
    <nav className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      {lessonTitle && (
        <div className="rounded-2xl bg-primary/15 text-primary px-4 py-3 mb-4 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-primary/70">Lesson</div>
          <div className="text-sm font-semibold leading-snug text-primary">{lessonTitle}</div>
        </div>
      )}

      <div className="text-xs uppercase font-semibold tracking-wide text-gray-500 mb-3">In this lesson</div>
      {renderedToc.length === 0 && (
        <div className="text-xs text-gray-400">Headings will appear here as you add content.</div>
      )}
      <ul className="space-y-1">
        {renderedToc.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => handleScroll(entry.id)}
              className={`block w-full text-left rounded-md px-3 py-2 text-sm transition ${
                entry.level >= 4 ? 'pl-6 text-xs' : entry.level === 3 ? 'pl-4' : ''
              } ${
                activeId === entry.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-700 hover:bg-primary/10 hover:text-primary'
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