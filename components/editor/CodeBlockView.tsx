import React, { useRef, useEffect, useState } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { Moon, Sun } from 'lucide-react'

const LANGUAGES = [
  'typescript', 'javascript', 'html', 'css', 'json', 'bash', 'sql', 'python', 'java', 'c', 'cpp', 'rust', 'go'
]

interface CodeBlockViewProps {
  node: any
  updateAttributes: (attrs: Record<string, any>) => void
  extension: any
}

export default function CodeBlockView({ node, updateAttributes }: CodeBlockViewProps) {
  const currentLang = node.attrs.language || 'typescript'
  const [isDarkMode, setIsDarkMode] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  // Block TipTap focus stealing
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const stopNative = (e: Event) => {
      e.stopPropagation()
      e.preventDefault()
    }
    el.addEventListener('mousedown', stopNative, { capture: true })
    el.addEventListener('touchstart', stopNative, { capture: true })
    return () => {
      el.removeEventListener('mousedown', stopNative, { capture: true })
      el.removeEventListener('touchstart', stopNative, { capture: true })
    }
  }, [])

  return (
    <NodeViewWrapper 
      className={`my-6 relative rounded-2xl overflow-hidden border shadow-sm ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}
      dir="ltr"
    >
      {/* Premium minimal header mirroring the wiki */}
      <div
        ref={headerRef}
        className={`flex items-center justify-between px-4 py-2 border-b overflow-x-auto scrollbar-none ${isDarkMode ? 'border-gray-800 bg-[#0d1117]' : 'border-gray-200 bg-gray-100'}`}
        contentEditable={false}
      >
        <div className="flex gap-4">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                updateAttributes({ language: lang })
              }}
              className={`text-[11px] font-mono tracking-wider uppercase whitespace-nowrap transition-colors ${
                currentLang === lang
                  ? (isDarkMode ? 'text-gray-200 font-semibold' : 'text-gray-900 font-bold')
                  : (isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Theme Toggle - Read-only styling just for the editor to preview themes */}
        <div className="flex items-center gap-2 pl-4">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDarkMode(!isDarkMode)
            }}
            className={`transition-colors flex-shrink-0 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </div>

      {/* Code body - Premium Light/Dark */}
      <div className={`${isDarkMode ? 'bg-[#161b22] hljs-theme-dark' : 'bg-gray-50 hljs-theme-light'}`}>
        <pre className="!bg-transparent !m-0 !p-4 !overflow-hidden !whitespace-pre-wrap !break-words !text-[15px] !font-mono !leading-relaxed">
          <NodeViewContent as={"code" as any} className={`!font-mono !text-[15px] !leading-relaxed !whitespace-pre-wrap !break-words ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`} />
        </pre>
      </div>
    </NodeViewWrapper>
  )
}

