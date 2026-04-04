"use client"

import { useState } from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { Moon, Sun, Check, Copy } from 'lucide-react'
import './editor/hljs.css' // Import exact same highlight.js styles as the editor

interface CodeBlockProps {
  code: string
  language?: string
  locale?: 'en' | 'ar'
}

export default function CodeBlock({ code, language = 'typescript', locale = 'en' }: CodeBlockProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayLang = language || 'text'

  return (
    <div className={`my-6 relative rounded-3xl overflow-hidden border ${isDarkMode ? 'border-gray-800 bg-[#161b22]' : 'border-gray-200 bg-gray-50 text-gray-900'} shadow-md`} dir="ltr">
      {/* Premium minimal header */}
      <div className={`flex items-center justify-between px-4 py-2 text-xs border-b ${isDarkMode ? 'border-gray-800 bg-[#0d1117] text-gray-400' : 'border-gray-200 bg-gray-100 text-gray-500'}`}>
        <div className="font-mono tracking-wider uppercase font-semibold text-[11px]">
          {displayLang}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-white' : 'hover:text-black'}`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 transition-colors flex-shrink-0 ${isDarkMode ? 'hover:text-white' : 'hover:text-black'}`}
            title="Copy code"
          >
            {copied ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Copy size={14} />
            )}
          </button>
        </div>
      </div>

      {/* Code body matched exactly to Editor highlight.js styles */}
      <div className={`${isDarkMode ? 'bg-[#161b22] hljs-theme-dark' : 'bg-gray-50 hljs-theme-light'}`}>
        <SyntaxHighlighter
          language={language.toLowerCase()}
          useInlineStyles={false}
          wrapLines={true}
          wrapLongLines={true}
          PreTag="pre"
          CodeTag="code"
          className="!bg-transparent !m-0 !p-4 !overflow-hidden !whitespace-pre-wrap !break-words"
          codeTagProps={{
            className: `!font-mono !text-[15px] !leading-relaxed !whitespace-pre-wrap !break-words ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

