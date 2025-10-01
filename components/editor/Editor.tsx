"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Heading from '@tiptap/extension-heading'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { common, createLowlight } from 'lowlight'
const lowlightInstance = createLowlight(common)
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import BubbleMenuExt from '@tiptap/extension-bubble-menu'
import { SlashCommand } from './SlashCommand'
import TableCellWithBackground from './extensions/TableCellWithBackground'
import { useRouter, useSearchParams } from 'next/navigation'

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

const bubbleIdEn = 'table-bubble-menu-en'
const textBubbleIdEn = 'text-bubble-menu-en'

export default function WikiEditor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [meta, setMeta] = useState(() => {
    const base = {
      id: '',
      slug: '',
      wikiSlug: 'student-kit',
      order: 0,
      title_en: '',
      title_ar: '',
      duration_min: 30,
      difficulty: 'Beginner',
    }
    
    // Check for URL parameters first
    if (typeof window !== 'undefined' && searchParams) {
      const urlWiki = searchParams.get('wiki')?.trim()
      const urlKit = searchParams.get('kit')?.trim()
      const urlSlug = searchParams.get('slug')?.trim()
      const urlId = searchParams.get('id')?.trim()
      const urlTitle = searchParams.get('title')?.trim()
      
      if (urlWiki || urlKit || urlSlug || urlId || urlTitle) {
        const urlMeta = {
          ...base,
          wikiSlug: urlWiki || urlKit || base.wikiSlug,
          slug: urlSlug || (urlId ? slugify(urlId) : ''),
          id: urlId || (urlSlug ? slugify(urlSlug) : ''),
          title_en: urlTitle || '',
        }
        
        // Store in sessionStorage so it persists
        try {
          sessionStorage.setItem('lessonMeta', JSON.stringify(urlMeta))
        } catch {}
        
        return urlMeta
      }
    }
    
    // Fallback to sessionStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('lessonMeta')
        if (raw) {
          const parsed = JSON.parse(raw)
          return {
            ...base,
            ...parsed,
            wikiSlug: parsed.wikiSlug || base.wikiSlug,
          }
        }
      } catch {}
    }
    return base
  })
  const displayTitle = useMemo(() => {
    const english = typeof meta.title_en === 'string' ? meta.title_en.trim() : ''
    const arabic = typeof meta.title_ar === 'string' ? meta.title_ar.trim() : ''
    const slug = typeof meta.slug === 'string' ? meta.slug.trim() : ''
    const id = typeof meta.id === 'string' ? meta.id.trim() : ''
    return english || arabic || slug || id
  }, [meta.title_en, meta.title_ar, meta.slug, meta.id])

  const isGettingStarted = meta.slug === 'getting-started' || meta.id === 'getting-started'

  const bubbleElementEnRef = useRef<HTMLElement | null>(null)
  const textBubbleElementEnRef = useRef<HTMLElement | null>(null)
  const [bubbleElementEn, setBubbleElementEn] = useState<HTMLElement | null>(null)
  const [textBubbleElementEn, setTextBubbleElementEn] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const tableElement = document.getElementById(bubbleIdEn) as HTMLElement | null
    const textElement = document.getElementById(textBubbleIdEn) as HTMLElement | null
    bubbleElementEnRef.current = tableElement
    textBubbleElementEnRef.current = textElement
    setBubbleElementEn(tableElement)
    setTextBubbleElementEn(textElement)
  }, [])

  const initialTitleRef = useRef<string | null>(null)
  if (initialTitleRef.current === null) {
    initialTitleRef.current = (meta.title_en || meta.title_ar || meta.slug || meta.id || '').trim()
  }

  const initialContentRef = useRef<any | null>(null)
  if (initialContentRef.current === null) {
    initialContentRef.current = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: initialTitleRef.current ? [{ type: 'text', text: initialTitleRef.current }] : [],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Introduction' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Welcome to this lesson. Here we will learn about the basics.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Getting Started' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'First, make sure you have all the required materials.' }],
        },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Required Materials' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'You will need: Arduino board, LED lights, resistors, and jumper wires.' }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Building the Circuit' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Now let\'s start building our first circuit.' }],
        },
      ],
    }
  }

  const editorEn = useEditor({
    immediatelyRender: false,
    editable: !isGettingStarted,
    extensions: [
      StarterKit.configure({
        blockquote: { HTMLAttributes: { class: 'border-l-4 border-gray-300 pl-3 py-2 bg-gray-50 rounded' } },
      }),
      Heading.configure({ 
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: ({ level }: { level: number }) => {
            switch (level) {
              case 1: return 'text-2xl font-bold mt-8 mb-4'
              case 2: return 'text-xl font-semibold mt-6 mb-3'
              case 3: return 'text-lg font-medium mt-4 mb-2'
              default: return 'text-base font-medium mt-4 mb-2'
            }
          }
        }
      }),
      Image,
      Youtube.configure({ controls: true }),
      Link.configure({ openOnClick: true, autolink: true, linkOnPaste: true }),
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCellWithBackground,
      CodeBlockLowlight.configure({ lowlight: lowlightInstance }),
      BubbleMenuExt.configure({
        element: bubbleElementEn,
        pluginKey: 'table-bubble-en',
        shouldShow: ({ editor }) => editor.isActive('table'),
        options: { placement: 'top', offset: 8 },
      }),
      BubbleMenuExt.configure({
        element: textBubbleElementEn,
        pluginKey: 'text-bubble-en',
        shouldShow: ({ editor, view, state, oldState, from, to }) => {
          // Only show when there's a text selection and not in a table
          const hasSelection = from !== to && state.selection.empty === false
          const isNotInTable = !editor.isActive('table')
          const hasTextContent = state.selection.content().content.size > 0
          
          return isNotInTable && hasSelection && hasTextContent
        },
        options: { placement: 'top', offset: 8 },
      }),
      Placeholder.configure({ placeholder: "Type '/' for commands" }),
      SlashCommand,
    ],
    content: initialContentRef.current,
    editorProps: {
      attributes: { class: 'max-w-none focus:outline-none', lang: 'en' },
    },
  }, [bubbleElementEn, textBubbleElementEn])

  const editorAr = useEditor({
    immediatelyRender: false,
    editable: !isGettingStarted,
    extensions: [
      StarterKit.configure({
        blockquote: { HTMLAttributes: { class: 'border-l-4 border-gray-300 pl-3 py-2 bg-gray-50 rounded' } },
      }),
      Heading.configure({ 
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: ({ level }: { level: number }) => {
            switch (level) {
              case 1: return 'text-2xl font-bold mt-8 mb-4'
              case 2: return 'text-xl font-semibold mt-6 mb-3'
              case 3: return 'text-lg font-medium mt-4 mb-2'
              default: return 'text-base font-medium mt-4 mb-2'
            }
          }
        }
      }),
      Image,
      Youtube.configure({ controls: true }),
      Link.configure({ openOnClick: true, autolink: true, linkOnPaste: true }),
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCellWithBackground,
      CodeBlockLowlight.configure({ lowlight: lowlightInstance }),
      Placeholder.configure({ placeholder: "اكتب '/' للإدراج" }),
      SlashCommand,
    ],
    content: initialContentRef.current,
    editorProps: {
      attributes: { class: 'max-w-none focus:outline-none', lang: 'ar', dir: 'rtl' },
    },
  }, [])

  const [status, setStatus] = useState<string>('')



  const syncingEnRef = useRef(false)
  const syncingArRef = useRef(false)
  const arabicDirtyRef = useRef(false)
  const [, forceArabicDirtyRender] = useState(false)

  function getFirstHeadingText(editor: any): string {
    const json: any = editor?.getJSON()
    const content = json?.content as any[] | undefined
    if (!content || content.length === 0) return ''
    const firstHeading = content.find((n) => n?.type === 'heading')
    if (!firstHeading) return ''
    const texts = (firstHeading.content || [])
      .filter((c: any) => c?.type === 'text' && typeof c.text === 'string')
      .map((c: any) => c.text)
    return texts.join('').trim()
  }

  function applyTitleToDocument(editor: any, title: string) {
    if (!editor) return
    const normalizedTitle = title.trim()
    const json: any = editor.getJSON()
    const rest: any[] = Array.isArray(json?.content) ? json.content.slice() : []
    const newFirst = {
      type: 'heading',
      attrs: { level: 1 },
      content: normalizedTitle ? [{ type: 'text', text: normalizedTitle }] : [],
    }
    const nextContent = [newFirst, ...(rest.length && rest[0]?.type === 'heading' ? rest.slice(1) : rest)]
    if (editor === editorEn) syncingEnRef.current = true
    if (editor === editorAr) syncingArRef.current = true
    editor.commands.setContent({ type: 'doc', content: nextContent }, { emitUpdate: false })
    if (editor === editorEn) setTimeout(() => { syncingEnRef.current = false }, 0)
    if (editor === editorAr) setTimeout(() => { syncingArRef.current = false }, 0)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Check if we have URL parameters that can create lesson metadata
    const hasUrlParams = searchParams && (
      searchParams.get('wiki') || 
      searchParams.get('kit') || 
      searchParams.get('slug') || 
      searchParams.get('id') || 
      searchParams.get('title')
    )
    
    try {
      const raw = sessionStorage.getItem('lessonMeta')
      if (!raw && !hasUrlParams) {
        router.replace('/editor/properties')
        return
      }
      
      if (raw) {
        const parsed = JSON.parse(raw)
        setMeta((m) => ({
          ...m,
          ...parsed,
          wikiSlug: parsed.wikiSlug || m.wikiSlug || 'student-kit',
        }))
      }
    } catch {
      if (!hasUrlParams) {
        router.replace('/editor/properties')
      }
    }
  }, [router, searchParams])

  useEffect(() => {
    if (!editorEn) return
    const handler = () => {
      if (syncingEnRef.current) return
      const h1 = getFirstHeadingText(editorEn)
      if (h1) {
        setMeta((m) => {
          const next = { ...m, title_en: h1 }
          try { sessionStorage.setItem('lessonMeta', JSON.stringify(next)) } catch {}
          return next
        })
      }
      if (!arabicDirtyRef.current && editorAr) {
        syncingArRef.current = true
        editorAr.commands.setContent(editorEn.getJSON(), { emitUpdate: false })
        setTimeout(() => { syncingArRef.current = false }, 0)
      }
    }
    editorEn.on('update', handler)
    return () => { editorEn.off('update', handler) }
  }, [editorEn, editorAr])

  useEffect(() => {
    if (!editorAr) return
    const handler = () => {
      if (syncingArRef.current) return
      arabicDirtyRef.current = true
      forceArabicDirtyRender((prev) => !prev)
      const h1 = getFirstHeadingText(editorAr)
      if (h1) {
        setMeta((m) => {
          const next = { ...m, title_ar: h1 }
          try { sessionStorage.setItem('lessonMeta', JSON.stringify(next)) } catch {}
          return next
        })
      }
    }
    editorAr.on('update', handler)
    return () => { editorAr.off('update', handler) }
  }, [editorAr])

  useEffect(() => {
    if (!editorEn) return
    const preferred = (meta.title_en || meta.title_ar || meta.slug || meta.id || '').trim()
    if (!preferred) return
    const current = getFirstHeadingText(editorEn)
    if (!current || current === 'Untitled' || current !== preferred) {
      applyTitleToDocument(editorEn, preferred)
    }
  }, [editorEn, meta.title_en, meta.title_ar, meta.slug, meta.id])

  useEffect(() => {
    if (!editorAr) return
    if (arabicDirtyRef.current) return
    const preferred = (meta.title_ar || meta.title_en || meta.slug || meta.id || '').trim()
    if (!preferred) return
    const current = getFirstHeadingText(editorAr)
    if (!current || current === 'Untitled' || current !== preferred) {
      applyTitleToDocument(editorAr, preferred)
    }
  }, [editorAr, meta.title_ar, meta.title_en, meta.slug, meta.id])

  useEffect(() => {
    const slug = typeof meta.slug === 'string' ? meta.slug.trim() : ''
    const id = typeof meta.id === 'string' ? meta.id.trim() : ''
    if (!slug && !id) return
    try { sessionStorage.setItem('lessonMeta', JSON.stringify(meta)) } catch {}
  }, [meta])

  const supportsColorEn = useMemo(() => Boolean(editorEn?.schema?.marks?.textStyle), [editorEn])
  const tableColors = [
    { name: 'None', value: '' },
    { name: 'Yellow', value: '#FEF9C3' },
    { name: 'Green', value: '#DCFCE7' },
    { name: 'Blue', value: '#DBEAFE' },
    { name: 'Red', value: '#FEE2E2' },
    { name: 'Purple', value: '#EDE9FE' },
  ]
  const textColors = ['#111827','#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6']
  const highlightColors = ['#fff59d','#bbf7d0','#bfdbfe','#fecaca','#e9d5ff']

  function markExcelLikeFocus(editor: any) {
    if (!editor) return
    const root = editor.view.dom as HTMLElement
    root.querySelectorAll('td.pm-excel-col, th.pm-excel-col').forEach(el => el.classList.remove('pm-excel-col'))
    root.querySelectorAll('tr.pm-excel-row').forEach(el => el.classList.remove('pm-excel-row'))
    root.querySelectorAll('td.pm-excel-cell, th.pm-excel-cell').forEach(el => el.classList.remove('pm-excel-cell'))
    const sel = document.getSelection()
    if (!sel || !sel.focusNode) return
    const cell = (sel.focusNode as Node).parentElement?.closest('td, th') as HTMLTableCellElement | null
    if (!cell) return
    const row = cell.parentElement as HTMLTableRowElement | null
    const table = cell.closest('table') as HTMLTableElement | null
    if (!row || !table) return
    row.classList.add('pm-excel-row')
    const colIndex = cell.cellIndex
    Array.from(table.rows).forEach(r => { const c = r.cells.item(colIndex); if (c) c.classList.add('pm-excel-col') })
    cell.classList.add('pm-excel-cell')
  }

  useEffect(() => {
    if (!editorEn) return
    const selectionHandler = () => {
      markExcelLikeFocus(editorEn)
      if (editorEn.state.selection.empty) editorEn.chain().unsetHighlight().run()
    }
    const transactionHandler = () => markExcelLikeFocus(editorEn)
    editorEn.on('selectionUpdate', selectionHandler)
    editorEn.on('transaction', transactionHandler)
    return () => {
      editorEn.off('selectionUpdate', selectionHandler)
      editorEn.off('transaction', transactionHandler)
    }
  }, [editorEn])

  function extractBody(doc: any, language: 'en' | 'ar') {
    const out: any[] = []
    const textKey = language === 'ar' ? 'ar' : 'en'
    const titleKey = language === 'ar' ? 'title_ar' : 'title_en'
    const captionKey = language === 'ar' ? 'caption_ar' : 'caption_en'

    const walk = (nodes?: any[]) => {
      if (!nodes) return
      for (const n of nodes) {
        if (n.type === 'paragraph') {
          const text = (n.content || []).filter((c: any) => c.type === 'text').map((t: any) => t.text).join('')
          if (text.trim()) out.push({ type: 'paragraph', [textKey]: text })
        } else if (n.type === 'blockquote') {
          const text = (n.content || []).flatMap((p: any) => (p.content || [])).filter((c: any) => c.type === 'text').map((t: any) => t.text).join(' ')
          if (text.trim()) out.push({ type: 'callout', variant: 'info', [textKey]: text })
        } else if (n.type === 'heading') {
          const text = (n.content || []).filter((c: any) => c.type === 'text').map((t: any) => t.text).join('')
          if (text.trim()) {
            const level = Number(n.attrs?.level) || 2
            out.push({ type: 'heading', [textKey]: text, level })
          }
        } else if (n.type === 'image' && n.attrs?.src) {
          const alt = typeof n.attrs?.alt === 'string' ? n.attrs.alt.trim() : ''
          out.push({
            type: 'image',
            image: n.attrs.src,
            [titleKey]: alt || undefined,
            [captionKey]: alt || undefined,
          })
        }
        if (n.content) walk(n.content)
      }
    }
    walk(doc?.content)
    return out
  }

  async function publish() {
    if (!editorEn || !editorAr) return
    if (!meta.wikiSlug) {
      setStatus('Missing wiki selection. Open the properties panel to choose a wiki.')
      return
    }
    setStatus('')
    const docEn = editorEn.getJSON()
    const docAr = editorAr.getJSON()
    const bodyEn = extractBody(docEn, 'en')
    const bodyAr = extractBody(docAr, 'ar')
    const maxLen = Math.max(bodyEn.length, bodyAr.length)
    const mergedBody = [] as any[]
    for (let i = 0; i < maxLen; i++) {
      mergedBody.push({ ...(bodyEn[i] || {}), ...(bodyAr[i] || {}) })
    }
    if (bodyEn.length !== bodyAr.length) {
      setStatus('Warning: English and Arabic content differ in structure. Please review the Arabic translation.')
    }
    // Generate ID and slug if they don't exist
    const titleEn = meta.title_en || meta.title_ar || 'Untitled'
    const titleAr = meta.title_ar || meta.title_en || 'عنوان غير متوفر'
    
    // Generate ID and slug - API will handle uniqueness
    const generatedId = (meta.id && meta.id.trim()) || slugify(titleEn)
    const generatedSlug = (meta.slug && meta.slug.trim()) || slugify(titleEn)
    
    // Ensure we have valid IDs and slugs
    if (!generatedId || !generatedSlug) {
      setStatus('Error: Could not generate valid ID or slug from title')
      return
    }
    
    const payload = {
      id: generatedId,
      wikiSlug: meta.wikiSlug,
      order: Number(meta.order) || 0,
      slug: generatedSlug,
      title_en: titleEn,
      title_ar: titleAr,
      duration_min: Number(meta.duration_min) || 30,
      difficulty: meta.difficulty,
      prerequisites_en: [],
      prerequisites_ar: [],
      materials: [],
      body: mergedBody,
    }
    try {
      console.log('Publishing lesson with payload:', payload)
      const res = await fetch('/api/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) {
        console.error('API Error:', data)
        const detail = Array.isArray(data.missing) && data.missing.length ? ` (missing: ${data.missing.join(', ')})` : ''
        throw new Error((data.error || 'Failed') + detail)
      }
      setStatus('Published!')
    } catch (e: any) {
      console.error('Publish error:', e)
      setStatus(`Error: ${e.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#eef2f1]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="font-semibold text-lg">Lesson Editor</h1>
              {isGettingStarted && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Read Only
                </span>
              )}
              {status && <div className="text-sm text-gray-600">{status}</div>}
            </div>
            {(displayTitle || meta.slug || meta.wikiSlug) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                {displayTitle && <span className="font-medium text-gray-700">{displayTitle}</span>}
                {meta.slug && <span>Slug: {meta.slug}</span>}
                {meta.wikiSlug && <span>Wiki: {meta.wikiSlug}</span>}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {isGettingStarted ? (
              <button 
                className="px-3 py-1.5 rounded-md bg-gray-400 text-white text-sm cursor-not-allowed" 
                disabled
                title="Getting Started lesson cannot be published"
              >
                Read Only - Cannot Publish
              </button>
            ) : (
              <button className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:opacity-90" onClick={publish}>Publish to Wiki</button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* English Editor Pane */}
          <div className={`bg-white border rounded-xl shadow-sm ${isGettingStarted ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
            <div className={`px-6 pt-6 pb-4 border-b text-sm ${isGettingStarted ? 'border-orange-200 text-orange-700' : 'text-gray-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>English (left to right)</span>
                  {isGettingStarted && (
                    <span className="text-xs font-medium text-orange-600">Read Only</span>
                  )}
                </div>
                {!isGettingStarted && (
                  <span className="text-xs text-gray-400">Press <span className="px-1 rounded bg-gray-100">/</span> for commands</span>
                )}
              </div>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div id={bubbleIdEn} className="rounded-lg border bg-white shadow p-1 flex items-center gap-1 text-xs" style={{ position: 'absolute', left: -9999, top: -9999, visibility: 'hidden' }}>
                <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => editorEn?.chain().focus().addRowBefore().run()}>Row +</button>
                <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => editorEn?.chain().focus().addRowAfter().run()}>Row -</button>
                <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => editorEn?.chain().focus().addColumnBefore().run()}>Col +</button>
                <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => editorEn?.chain().focus().addColumnAfter().run()}>Col -</button>
                <span className="mx-1 h-4 w-px bg-gray-200" />
                <button className="px-2 py-1 rounded hover:bg-gray-100 text-red-600" onClick={() => editorEn?.chain().focus().deleteRow().run()}>Del Row</button>
                <button className="px-2 py-1 rounded hover:bg-gray-100 text-red-600" onClick={() => editorEn?.chain().focus().deleteColumn().run()}>Del Col</button>
                <span className="mx-1 h-4 w-px bg-gray-200" />
                <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => editorEn?.chain().focus().toggleHeaderRow().run()}>Hdr Row</button>
                <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => editorEn?.chain().focus().toggleHeaderColumn().run()}>Hdr Col</button>
                <span className="mx-1 h-4 w-px bg-gray-200" />
                <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => editorEn?.chain().focus().mergeCells().run()}>Merge</button>
                <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => editorEn?.chain().focus().splitCell().run()}>Split</button>
                <span className="mx-1 h-4 w-px bg-gray-200" />
                <div className="flex items-center gap-1" title="Cell color">
                  {tableColors.map(c => (
                    <button key={c.name} className="w-4 h-4 rounded border" style={{ background: c.value || 'transparent' }} onClick={() => editorEn?.chain().focus().setCellAttribute('backgroundColor', c.value || null).run()} />
                  ))}
                </div>
                <span className="mx-1 h-4 w-px bg-gray-200" />
                <button className="px-2 py-1 rounded hover:bg-gray-100 text-red-700" onClick={() => editorEn?.chain().focus().deleteTable().run()}>Delete</button>
              </div>

              <div id={textBubbleIdEn} className="mt-2 rounded-lg border bg-white shadow p-1 flex items-center gap-1 text-xs" style={{ position: 'absolute', left: -9999, top: -9999, visibility: 'hidden' }}>
                <button className="px-2 py-1 rounded hover:bg-gray-100 font-semibold" onClick={() => editorEn?.chain().focus().toggleBold().run()}>B</button>
                <button className="px-2 py-1 rounded hover:bg-gray-100 italic" onClick={() => editorEn?.chain().focus().toggleItalic().run()}>I</button>
                <button className="px-2 py-1 rounded hover:bg-gray-100 underline" onClick={() => editorEn?.chain().focus().toggleUnderline().run()}>U</button>
                <button className="px-2 py-1 rounded hover:bg-gray-100 line-through" onClick={() => editorEn?.chain().focus().toggleStrike().run()}>S</button>
                <span className="mx-1 h-4 w-px bg-gray-200" />
                {textColors.map(col => (
                  <button key={col} className="w-4 h-4 rounded border" style={{ background: col }} onClick={() => { if (!editorEn || !supportsColorEn) return; editorEn.chain().focus().setColor(col).run() }} />
                ))}
                <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => supportsColorEn ? editorEn?.chain().focus().unsetColor().run() : undefined}>Clear</button>
                <span className="mx-1 h-4 w-px bg-gray-200" />
                {highlightColors.map(col => (
                  <button key={col} className="w-4 h-4 rounded border" style={{ background: col }} onClick={() => { if (!editorEn) return; editorEn.chain().focus().toggleHighlight({ color: col }).run() }} />
                ))}
                <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={() => editorEn?.chain().focus().unsetHighlight().run()}>Clear</button>
              </div>

              <EditorContent editor={editorEn} />
            </div>
          </div>

          {/* Arabic Editor Pane */}
          <div className={`bg-white border rounded-xl shadow-sm ${isGettingStarted ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
            <div className={`px-6 pt-6 pb-4 border-b text-sm ${isGettingStarted ? 'border-orange-200 text-orange-700' : 'text-gray-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Arabic (right to left)</span>
                  {isGettingStarted && (
                    <span className="text-xs font-medium text-orange-600">Read Only</span>
                  )}
                </div>
                {!isGettingStarted && (
                  <span className="text-xs text-gray-400">يمكنك استخدام الأمر <span className="px-1 rounded bg-gray-100">/</span> للإدراج</span>
                )}
              </div>
            </div>
            <div className="px-6 py-6 space-y-4">
              {arabicDirtyRef.current && (
                <div className="text-xs text-amber-600">Arabic content has diverged from the English draft.</div>
              )}
              <EditorContent editor={editorAr} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}





