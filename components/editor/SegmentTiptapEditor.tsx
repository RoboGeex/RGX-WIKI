'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import TableCellWithBackground from './extensions/TableCellWithBackground'
import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react'
import { isTextSelection } from '@tiptap/core'

interface SegmentTiptapEditorProps {
  content: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  dir?: 'ltr' | 'rtl'
  lang?: 'en' | 'ar'
  className?: string
  autoFocus?: boolean
  placeholderClassName?: string
}

function normalizeUrl(value: string): string {
  const url = value.trim()
  if (!url) return ''
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
    return url
  }
  return `https://${url}`
}

function promptForLink(editor: any) {
  if (typeof window === 'undefined' || !editor || editor.isDestroyed) return
  const previous = editor.getAttributes('link')?.href || ''
  const input = window.prompt('Enter link URL', previous)
  if (input === null) return
  
  const url = normalizeUrl(input)
  if (!url) {
    editor.chain().focus().unsetLink().run()
    return
  }
  editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' })
    .run()
}

export default memo(function SegmentTiptapEditor({
  content,
  onChange,
  onBlur,
  placeholder,
  dir = 'ltr',
  lang = 'en',
  className = '',
  autoFocus = false,
  placeholderClassName
}: SegmentTiptapEditorProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [menuRef, setMenuRef] = useState<HTMLDivElement | null>(null)
  const [tableMenuRef, setTableMenuRef] = useState<HTMLDivElement | null>(null)
  const lastContentRef = useRef(content)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      blockquote: false,
    }),
    Underline,
    Link.configure({ openOnClick: true, autolink: true, linkOnPaste: true }),
    TextStyle,
    Color.configure({ types: ['textStyle'] }),
    Highlight.configure({ multicolor: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
  ], [])

  const updateBubbleMenu = useCallback((editor: any) => {
    // Hide both menus initially
    if (menuRef) {
       menuRef.style.visibility = 'hidden'
       menuRef.style.top = '-9999px'
       menuRef.style.left = '-9999px'
    }
    if (tableMenuRef) {
       tableMenuRef.style.visibility = 'hidden'
       tableMenuRef.style.top = '-9999px'
       tableMenuRef.style.left = '-9999px'
    }

    if (!editor || editor.isDestroyed || !editor.view || !editor.view.dom) return

    try {
      // 1. Check for Table Selection first
      if (editor.isActive('table')) {
        if (!tableMenuRef) return
        
        // Find the current selection or cursor position
        const { from } = editor.state.selection
        const start = editor.view.coordsAtPos(from)
        
        // Simple positioning: near the cursor
        const box = tableMenuRef.getBoundingClientRect()
        // Use viewport coordinates directly for fixed positioning
        const top = start.top - box.height - 10
        const left = start.left - (box.width / 2) // Center slightly

        tableMenuRef.style.transform = `translate(${left}px, ${top}px)`
        tableMenuRef.style.visibility = 'visible'
        tableMenuRef.style.top = '0px'
        tableMenuRef.style.left = '0px'
        return
      }

      // 2. Check for Text Selection
      const { selection } = editor.state
      const { from, to } = selection
      const isText = isTextSelection(selection)
      
      if (!isText || from === to || selection.empty || selection.content().content.size === 0) {
        return
      }

      if (menuRef) {
        // Safe coordinate calculation
        const start = editor.view.coordsAtPos(from)
        const end = editor.view.coordsAtPos(to)
        const box = menuRef.getBoundingClientRect()
        
        // Calculate center of selection
        const selectionLeft = (start.left + end.right) / 2
        const selectionTop = start.top

        // Position above selection (viewport relative)
        const top = selectionTop - box.height - 10
        const left = selectionLeft - (box.width / 2)

        menuRef.style.transform = `translate(${left}px, ${top}px)`
        menuRef.style.visibility = 'visible'
        menuRef.style.top = '0px' 
        menuRef.style.left = '0px'
      }
    } catch (e) {
      // Fail silently
    }
  }, [menuRef, tableMenuRef])

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: content,
    editorProps: {
      attributes: {
        class: `focus:outline-none min-h-[1em] ${className}`,
        dir,
        lang,
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          if (menuRef?.contains(event.target as Node) || tableMenuRef?.contains(event.target as Node)) {
             return false
          }
          return false
        }
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (html !== lastContentRef.current) {
        lastContentRef.current = html
        onChange(html)
      }
      updateBubbleMenu(editor)
    },
    onSelectionUpdate: ({ editor }) => {
      updateBubbleMenu(editor)
    },
    onBlur: (event) => {
      const relatedTarget = event.event.relatedTarget as Node
      if (menuRef?.contains(relatedTarget) || tableMenuRef?.contains(relatedTarget)) {
        return
      }
      if (menuRef) {
         menuRef.style.visibility = 'hidden'
         menuRef.style.top = '-9999px'
         menuRef.style.left = '-9999px'
      }
      if (tableMenuRef) {
         tableMenuRef.style.visibility = 'hidden'
         tableMenuRef.style.top = '-9999px'
         tableMenuRef.style.left = '-9999px'
      }
      onBlur?.()
    },
  }, [extensions, updateBubbleMenu])

  useEffect(() => {
    if (editor && content !== editor.getHTML() && content !== lastContentRef.current) {
      lastContentRef.current = content
      editor.commands.setContent(content)
      updateBubbleMenu(editor)
    }
  }, [content, editor, updateBubbleMenu])

  useEffect(() => {
    if (editor && autoFocus && !editor.isDestroyed) {
      const timer = setTimeout(() => {
        if (!editor.isDestroyed) {
          editor.commands.focus()
          updateBubbleMenu(editor)
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [editor, autoFocus, updateBubbleMenu])

  // React to className/dir/lang changes dynamically
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: `focus:outline-none min-h-[1em] ${className}`,
            dir,
            lang,
          }
        }
      })
    }
  }, [editor, className, dir, lang])

  if (!isMounted) return <div className={`min-h-[1em] ${className}`} />;

  const textColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#000000']
  const highlightColors = ['#fef3c7', '#d1fae5', '#dbeafe', '#f3e8ff', '#fee2e2']

  return (
    <div className="relative w-full">
      {/* Table Bubble Menu */}
      <div 
        ref={setTableMenuRef}
        className="fixed z-[99999] rounded-lg border border-gray-200 bg-white shadow-xl p-1 flex items-center gap-1 text-[10px] sm:text-xs transition-opacity duration-100 flex-wrap max-w-[300px]"
        style={{ 
          visibility: 'hidden', 
          top: -9999, 
          left: -9999, 
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => {
          // Prevent editor blur when clicking blank space in menu
          if (e.target === e.currentTarget) e.preventDefault()
        }}
      >
         <button type="button" className="px-1.5 py-1 rounded hover:bg-gray-100" onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().addRowBefore().run() }} title="Row +">R+</button>
         <button type="button" className="px-1.5 py-1 rounded hover:bg-gray-100" onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().addRowAfter().run() }} title="Row -">R-</button>
         <button type="button" className="px-1.5 py-1 rounded hover:bg-gray-100" onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().addColumnBefore().run() }} title="Col +">C+</button>
         <button type="button" className="px-1.5 py-1 rounded hover:bg-gray-100" onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().addColumnAfter().run() }} title="Col -">C-</button>
         <div className="mx-1 h-3 w-px bg-gray-200" />
         <button type="button" className="px-1.5 py-1 rounded hover:bg-gray-100 text-red-600" onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().deleteRow().run() }} title="Del Row">DR</button>
         <button type="button" className="px-1.5 py-1 rounded hover:bg-gray-100 text-red-600" onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().deleteColumn().run() }} title="Del Col">DC</button>
         <div className="mx-1 h-3 w-px bg-gray-200" />
         <button type="button" className="px-1.5 py-1 rounded hover:bg-gray-100 text-red-700" onClick={() => editor?.chain().focus().deleteTable().run()} title="Delete Table">🗑️</button>
      </div>

      {/* Manual Bubble Menu (Text) */}
      <div 
        ref={setMenuRef}
        className="fixed z-[99999] rounded-lg border border-gray-200 bg-white shadow-xl p-1 flex items-center gap-1 text-[10px] sm:text-xs transition-opacity duration-100"
        style={{ 
          visibility: 'hidden', 
          top: -9999, 
          left: -9999, 
          pointerEvents: 'auto'
        }}
      >
        <button 
          type="button"
          title="Bold"
          className={`px-2 py-1 rounded hover:bg-gray-100 font-bold ${editor?.isActive('bold') ? 'bg-gray-100 text-primary' : 'text-gray-700'}`} 
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button 
          type="button"
          title="Italic"
          className={`px-2 py-1 rounded hover:bg-gray-100 italic ${editor?.isActive('italic') ? 'bg-gray-100 text-primary' : 'text-gray-700'}`} 
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button 
          type="button"
          title="Underline"
          className={`px-2 py-1 rounded hover:bg-gray-100 underline ${editor?.isActive('underline') ? 'bg-gray-100 text-primary' : 'text-gray-700'}`} 
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          U
        </button>
        <button 
          type="button"
          title="Strike"
          className={`px-2 py-1 rounded hover:bg-gray-100 line-through ${editor?.isActive('strike') ? 'bg-gray-100 text-primary' : 'text-gray-700'}`} 
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          S
        </button>
        
        <span className="mx-1 h-4 w-px bg-gray-200" />
        
        <button 
          type="button"
          className="px-2 py-1 rounded hover:bg-gray-100" 
          onClick={() => promptForLink(editor)}
        >
          Link
        </button>
        <button 
          type="button"
          className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30" 
          disabled={!editor?.isActive('link')}
          onClick={() => editor?.chain().focus().unsetLink().run()}
        >
          Unlink
        </button>
        
        <span className="mx-1 h-4 w-px bg-gray-200" />
        
        <div className="flex items-center gap-1">
          {textColors.map(col => (
            <button 
              type="button"
              key={col} 
              className="w-3.5 h-3.5 rounded-full border border-gray-200 hover:scale-110 transition-transform" 
              style={{ background: col }} 
              onClick={() => editor?.chain().focus().setColor(col).run()} 
            />
          ))}
          <button 
            type="button"
            className="px-1 text-gray-400 hover:text-gray-600" 
            title="Clear color"
            onClick={() => editor?.chain().focus().unsetColor().run()}
          >
            ×
          </button>
        </div>

        <span className="mx-1 h-4 w-px bg-gray-200" />

        <div className="flex items-center gap-1">
          {highlightColors.map(col => (
            <button 
              type="button"
              key={col} 
              className="w-3.5 h-3.5 rounded border border-gray-200 hover:scale-110 transition-transform" 
              style={{ background: col }} 
              onClick={() => editor?.chain().focus().toggleHighlight({ color: col }).run()} 
            />
          ))}
          <button 
            type="button"
            className="px-1 text-gray-400 hover:text-gray-600" 
            title="Clear highlight"
            onClick={() => editor?.chain().focus().unsetHighlight().run()}
          >
            ×
          </button>
        </div>
      </div>
      
      <EditorContent editor={editor} />
      
      {!editor?.getText() && !editor?.isActive('table') && placeholder && (
        <div 
          className={`absolute top-px ${dir === 'rtl' ? 'right-px' : 'left-px'} pointer-events-none text-gray-400 italic ${placeholderClassName || 'text-sm p-3'}`}
          dir={dir}
        >
          {placeholder}
        </div>
      )}
    </div>
  )
})
