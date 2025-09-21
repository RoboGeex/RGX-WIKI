"use client"

import { useState } from 'react'
import type { LessonBodyItem } from '@/lib/data'
import type { Locale } from '@/lib/i18n'

type TabKey = 'arduino' | 'microbit'
type Tab = { key: TabKey; label: string; enabled: boolean }

interface Props {
  codeItem: LessonBodyItem
  locale: Locale
}

export default function CodeTabs({ codeItem, locale: _locale }: Props) {
  const hasArduino = Boolean(codeItem.arduino)
  const hasMicrobit = Boolean(codeItem.makecodeUrl)
  const initial: TabKey = hasArduino ? 'arduino' : 'microbit'
  const [tab, setTab] = useState<TabKey>(initial)

  const defs: Tab[] = [
    { key: 'arduino', label: 'Arduino', enabled: hasArduino },
    { key: 'microbit', label: 'micro:bit', enabled: hasMicrobit },
  ]
  const tabs = defs.filter(t => t.enabled)

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="flex">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm font-medium ${
              tab === t.key ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'arduino' && hasArduino && (
        <pre className="p-4 text-xs bg-gray-900 text-gray-100 overflow-x-auto">
          {codeItem.arduino}
        </pre>
      )}

      {tab === 'microbit' && hasMicrobit && (
        <div className="p-4">
          <iframe
            src={codeItem.makecodeUrl}
            width="100%"
            height="360"
            className="rounded-md border"
            allow="fullscreen"
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}
