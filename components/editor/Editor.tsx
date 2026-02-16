"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Heading from '@tiptap/extension-heading'
import Image from './extensions/ResizableImage'
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
import { DOMSerializer, DOMParser as ProseDOMParser } from 'prosemirror-model'
import { SlashCommand } from './SlashCommand'
import TableCellWithBackground from './extensions/TableCellWithBackground'
import Video from './extensions/Video'
import ImageSlider from './extensions/ImageSlider'
import { CellSelection } from '@tiptap/pm/tables'
import type { EditorView } from '@tiptap/pm/view'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, Save, Rocket, Trash2, Link2, Unlock, X, Check, AlertTriangle, Globe, Eye } from 'lucide-react'
import './hljs.css'
import { applyDeveloperHeader, getDeveloperId, rememberDeveloperId } from './dev-identity'
import DeveloperLogin from './DeveloperLogin'

const CELL_DRAG_THRESHOLD = 4

function getCellPos(view: EditorView, cell: HTMLElement): number | null {
  if (!cell || !view.dom.contains(cell)) return null
  try {
    return view.posAtDOM(cell, 0)
  } catch {
    return null
  }
}

function setCellSelection(view: EditorView, anchorPos: number, headPos: number) {
  try {
    const { state, dispatch } = view
    const selection = CellSelection.create(state.doc, anchorPos, headPos)
    if (
      state.selection instanceof CellSelection &&
      state.selection.$anchorCell.pos === selection.$anchorCell.pos &&
      state.selection.$headCell.pos === selection.$headCell.pos
    ) {
      return
    }
    dispatch(state.tr.setSelection(selection))
  } catch (e) {
    // Silently ignore - the position wasn't inside a valid table cell
    return
  }
}

function handleTableMouseDown(view: EditorView, event: MouseEvent): boolean {
  if (event.button !== 0) return false
  const targetCell = (event.target as HTMLElement | null)?.closest('td, th')
  if (!targetCell) return false
  if (event.detail >= 2) {
    // Allow double-clicks to edit the text inside the cell
    return false
  }
  const anchorPos = getCellPos(view, targetCell as HTMLElement)
  if (anchorPos == null) return false

  let dragging = false
  const startX = event.clientX
  const startY = event.clientY
  let lastHeadPos = anchorPos

  const onMouseMove = (moveEvent: MouseEvent) => {
    const distanceX = Math.abs(moveEvent.clientX - startX)
    const distanceY = Math.abs(moveEvent.clientY - startY)
    if (!dragging && (distanceX >= CELL_DRAG_THRESHOLD || distanceY >= CELL_DRAG_THRESHOLD)) {
      dragging = true
      window.getSelection()?.removeAllRanges()
      setCellSelection(view, anchorPos, anchorPos)
    }

    if (!dragging) return
    moveEvent.preventDefault()
    const hovered = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest('td, th')
    if (!hovered) return
    const headPos = getCellPos(view, hovered as HTMLElement)
    if (headPos == null || headPos === lastHeadPos) return
    setCellSelection(view, anchorPos, headPos)
    lastHeadPos = headPos
  }

  const onMouseUp = (upEvent: MouseEvent) => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    if (dragging) {
      upEvent.preventDefault()
      view.focus()
    }
  }

  event.preventDefault()
  view.focus()
  setCellSelection(view, anchorPos, anchorPos)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  return true
}

function handleTableDragStart(_view: EditorView, event: Event): boolean {
  if ((event.target as HTMLElement | null)?.closest('table')) {
    event.preventDefault()
    return true
  }
  return false
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function promptForLink(editor: any) {
  if (typeof window === 'undefined' || !editor) return
  const previous = editor.getAttributes('link')?.href || ''
  const input = window.prompt('Enter link URL', previous)
  if (input === null) {
    return
  }
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

function normalizeUrl(value: string): string {
  const url = value.trim()
  if (!url) return ''
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
    return url
  }
  return `https://${url}`
}

const bubbleIdEn = 'table-bubble-menu-en'
const textBubbleIdEn = 'text-bubble-menu-en'
const bubbleIdAr = 'table-bubble-menu-ar'
const textBubbleIdAr = 'text-bubble-menu-ar'

export default function WikiEditor() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [developerId, setDeveloperId] = useState<string | undefined>(() => getDeveloperId())
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [meta, setMeta] = useState(() => {
    const base = {
      id: '',
      slug: '',
      wikiSlug: 'student-kit',
      order: 0,
      title_en: '',
      title_ar: '',
      coverImage: '',
      duration_min: 30,
      difficulty: 'Beginner',
      isNew: false,
      ownerId: '',
    }
    
    // Check for URL parameters first
    if (typeof window !== 'undefined' && searchParams) {
      const urlWiki = searchParams.get('wiki')?.trim()
      const urlKit = searchParams.get('kit')?.trim()
      const urlSlug = searchParams.get('slug')?.trim()
      const urlId = searchParams.get('id')?.trim()
      const urlTitle = searchParams.get('title')?.trim()
      
      if (urlWiki || urlKit || urlSlug || urlId || urlTitle) {
        let storedMeta: any = null
        try {
          const rawStored = sessionStorage.getItem('lessonMeta')
          if (rawStored) {
            storedMeta = JSON.parse(rawStored)
          }
        } catch {}

        const urlMeta = {
          ...base,
          ...(storedMeta || {}),
          wikiSlug: urlWiki || urlKit || storedMeta?.wikiSlug || base.wikiSlug,
          slug: urlSlug || (urlId ? slugify(urlId) : storedMeta?.slug || ''),
          id: urlId || (urlSlug ? slugify(urlSlug) : storedMeta?.id || ''),
          title_en: urlTitle || storedMeta?.title_en || '',
          coverImage: storedMeta?.coverImage || '',
          isNew: searchParams.get('new') === 'true',
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
            isNew: typeof parsed.isNew === 'boolean' ? parsed.isNew : base.isNew,
            coverImage: parsed.coverImage || '',
          }
        }
      } catch {}
    }
    return base
  })
  const metaRef = useRef(meta)
  useEffect(() => {
    metaRef.current = meta
  }, [meta])
  useEffect(() => {
    let cancelled = false
    const loadRole = async () => {
      if (!developerId) {
        setIsAdmin(false)
        return
      }
      try {
        const res = await fetch('/api/developers/me', { headers: applyDeveloperHeader() })
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data?.developer?.role) {
          setIsAdmin(data.developer.role === 'admin' || data.developer.role === 'superadmin')
        } else {
          setIsAdmin(false)
        }
      } catch {
        if (!cancelled) setIsAdmin(false)
      }
    }
    loadRole()
    return () => {
      cancelled = true
    }
  }, [developerId])
  const isOwner = Boolean(meta.ownerId && developerId && meta.ownerId === developerId)
  const saveDisabled = !isAdmin && !isOwner && !meta.isNew && Boolean(meta.ownerId)

  // Publish confirmation modal state
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishCheckpoints, setPublishCheckpoints] = useState({
    linguistic: false,
    media: false,
    ux: false,
    flow: false
  })

  // Verify & Mirror confirmation modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifyCheckpoints, setVerifyCheckpoints] = useState({
    content: false,
    structure: false,
    readability: false
  })

  // Reset checkpoints when modals open
  useEffect(() => {
    if (showPublishModal || showVerifyModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    if (showPublishModal) {
      setPublishCheckpoints({ linguistic: false, media: false, ux: false, flow: false })
    }
    if (showVerifyModal) {
      setVerifyCheckpoints({ content: false, structure: false, readability: false })
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showPublishModal, showVerifyModal])
  const displayTitle = useMemo(() => {
    const english = typeof meta.title_en === 'string' ? meta.title_en.trim() : ''
    const arabic = typeof meta.title_ar === 'string' ? meta.title_ar.trim() : ''
    const slug = typeof meta.slug === 'string' ? meta.slug.trim() : ''
    const id = typeof meta.id === 'string' ? meta.id.trim() : ''
    return english || arabic || slug || id
  }, [meta.title_en, meta.title_ar, meta.slug, meta.id])

  const bubbleElementEnRef = useRef<HTMLElement | null>(null)
  const textBubbleElementEnRef = useRef<HTMLElement | null>(null)
  const [bubbleElementEn, setBubbleElementEn] = useState<HTMLElement | null>(null)
  const [textBubbleElementEn, setTextBubbleElementEn] = useState<HTMLElement | null>(null)

  const bubbleElementArRef = useRef<HTMLElement | null>(null)
  const textBubbleElementArRef = useRef<HTMLElement | null>(null)
  const [bubbleElementAr, setBubbleElementAr] = useState<HTMLElement | null>(null)
  const [textBubbleElementAr, setTextBubbleElementAr] = useState<HTMLElement | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(!developerId)

  useEffect(() => {
    if (developerId) {
      rememberDeveloperId(developerId)
      setIsSigningIn(false)
    } else {
      setIsSigningIn(true)
    }
  }, [developerId])

  const handleDeveloperSignedIn = (id: string) => {
    rememberDeveloperId(id)
    setDeveloperId(id)
    setIsSigningIn(false)
  }

  useEffect(() => {
    if (typeof document === 'undefined') return
    // English
    const tableElement = document.getElementById(bubbleIdEn) as HTMLElement | null
    const textElement = document.getElementById(textBubbleIdEn) as HTMLElement | null
    bubbleElementEnRef.current = tableElement
    textBubbleElementEnRef.current = textElement
    setBubbleElementEn(tableElement)
    setTextBubbleElementEn(textElement)

    // Arabic
    const tableElementAr = document.getElementById(bubbleIdAr) as HTMLElement | null
    const textElementAr = document.getElementById(textBubbleIdAr) as HTMLElement | null
    bubbleElementArRef.current = tableElementAr
    textBubbleElementArRef.current = textElementAr
    setBubbleElementAr(tableElementAr)
    setTextBubbleElementAr(textElementAr)
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
          type: 'paragraph',
        },
      ],
    }
  }

  const editorEn = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: { HTMLAttributes: { class: 'border-l-4 border-gray-300 pl-3 py-2 bg-gray-50 rounded' } },
      }),
      Heading.configure({ 
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: ({ level }: { level: number }) => {
            switch (level) {
              case 1: return 'text-4xl font-bold mt-10 mb-5'
              case 2: return 'text-3xl font-semibold mt-8 mb-4'
              case 3: return 'text-2xl font-semibold mt-6 mb-3'
              default: return 'text-xl font-medium mt-5 mb-3'
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
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCellWithBackground,
      CodeBlockLowlight.configure({ lowlight: lowlightInstance }),
      Video,
      ImageSlider,
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
      Placeholder.configure({ placeholder: "type '/' to add a new element" }),
      SlashCommand.configure({
        getUploadContext: () => ({ wikiSlug: metaRef.current?.wikiSlug }),
      }),
    ],
    content: initialContentRef.current,
    editorProps: {
      attributes: { class: 'tiptap max-w-none focus:outline-none', lang: 'en' },
      handleDOMEvents: {
        mousedown: handleTableMouseDown,
        dragstart: handleTableDragStart,
      },
    },
  }, [bubbleElementEn, textBubbleElementEn])

  const [isVerified, setIsVerified] = useState(false)
  


  const editorAr = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: { HTMLAttributes: { class: 'border-l-4 border-gray-300 pl-3 py-2 bg-gray-50 rounded' } },
      }),
      Heading.configure({ 
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: ({ level }: { level: number }) => {
            switch (level) {
              case 1: return 'text-4xl font-bold mt-10 mb-5'
              case 2: return 'text-3xl font-semibold mt-8 mb-4'
              case 3: return 'text-2xl font-semibold mt-6 mb-3'
              default: return 'text-xl font-medium mt-5 mb-3'
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
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCellWithBackground,
      CodeBlockLowlight.configure({ lowlight: lowlightInstance }),
      Video,
      ImageSlider,
      BubbleMenuExt.configure({
        element: bubbleElementAr,
        pluginKey: 'table-bubble-ar',
        shouldShow: ({ editor }) => editor.isActive('table'),
        options: { placement: 'top', offset: 8 },
      }),
      BubbleMenuExt.configure({
        element: textBubbleElementAr,
        pluginKey: 'text-bubble-ar',
        shouldShow: ({ editor, view, state, from, to }) => {
          const hasSelection = from !== to && state.selection.empty === false
          const isNotInTable = !editor.isActive('table')
          const hasTextContent = state.selection.content().content.size > 0
          return isNotInTable && hasSelection && hasTextContent
        },
        options: { placement: 'top', offset: 8 },
      }),
      Placeholder.configure({ placeholder: "اكتب '/' للإدراج" }),
      SlashCommand.configure({
        getUploadContext: () => ({ wikiSlug: metaRef.current?.wikiSlug }),
      }),
    ],
    content: initialContentRef.current,
    editorProps: {
      attributes: { class: 'tiptap tiptap-rtl max-w-none focus:outline-none', lang: 'ar', dir: 'rtl' },
      handleDOMEvents: {
        mousedown: handleTableMouseDown,
        dragstart: handleTableDragStart,
      },
    },
  }, [bubbleElementAr, textBubbleElementAr])

  const handleVerifyAndMirror = () => {
    if (!editorEn || !editorAr) return
    const json = editorEn.getJSON()
    setIsVerified(true)
    editorAr.setEditable(true)
    
    // Mirror content
    syncingArRef.current = true
    editorAr.commands.setContent(json, { emitUpdate: false })
    setTimeout(() => { syncingArRef.current = false }, 0)
    
    setStatus('English Verified! Content mirrored to Arabic pane.')
  }

  useEffect(() => {
    if (editorAr) {
      editorAr.setEditable(isVerified)
    }
  }, [isVerified, editorAr])

  const [status, setStatus] = useState<string>('')



  const syncingEnRef = useRef(false)
  const syncingArRef = useRef(false)
  const arabicDirtyRef = useRef(false)
  const [, forceArabicDirtyRender] = useState(false)
  const loadedLessonKeyRef = useRef<string | null>(null)

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


  type CalloutVariant = 'info' | 'tip' | 'warning'

  const cloneNode = (node: any) => JSON.parse(JSON.stringify(node))

  const escapeHtml = (value: string): string =>
    typeof value === 'string'
      ? value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
      : ''

  const escapeAttribute = (value: string): string => escapeHtml(value)

  const applyMarks = (html: string, marks?: any[]): string => {
    if (!Array.isArray(marks) || marks.length === 0) return html
    return marks.reduce((acc: string, mark: any) => {
      if (!mark || typeof mark.type !== 'string') return acc
      switch (mark.type) {
        case 'bold':
          return '<strong>' + acc + '</strong>'
        case 'italic':
          return '<em>' + acc + '</em>'
        case 'underline':
          return '<u>' + acc + '</u>'
        case 'strike':
          return '<s>' + acc + '</s>'
        case 'code':
          return '<code>' + acc + '</code>'
        case 'link': {
          const href = mark.attrs?.href
          if (!href) return acc
          const target = mark.attrs?.target ? escapeAttribute(String(mark.attrs.target)) : '_blank'
          const rel = 'noopener noreferrer'
          return '<a href="' + escapeAttribute(String(href)) + '" target="' + target + '" rel="' + rel + '">' + acc + '</a>'
        }
        case 'textStyle': {
          const color = mark.attrs?.color
          if (!color) return acc
          return '<span style="color: ' + escapeAttribute(String(color)) + '">' + acc + '</span>'
        }
        case 'highlight': {
          const color = mark.attrs?.color
          const styleAttr = color ? ' style="background-color: ' + escapeAttribute(String(color)) + '"' : ''
          return '<mark' + styleAttr + '>' + acc + '</mark>'
        }
        default:
          return acc
      }
    }, html)
  }

  const serializeInline = (nodes?: any[]): { text: string; html: string } => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return { text: '', html: '' }
    }
    const textParts: string[] = []
    const htmlParts: string[] = []

    nodes.forEach((node: any) => {
      if (!node) return
      if (node.type === 'text') {
        const value = typeof node.text === 'string' ? node.text : ''
        textParts.push(value)
        let htmlValue = escapeHtml(value)
        htmlValue = applyMarks(htmlValue, node.marks)
        htmlParts.push(htmlValue)
        return
      }
      if (node.type === 'hardBreak') {
        textParts.push('\n')
        htmlParts.push('<br />')
        return
      }
      if (node.type === 'image' && node.attrs?.src) {
        const src = escapeAttribute(String(node.attrs.src))
        const altAttr = node.attrs?.alt ? ' alt="' + escapeAttribute(String(node.attrs.alt)) + '"' : ''
        const titleAttr = node.attrs?.title ? ' title="' + escapeAttribute(String(node.attrs.title)) + '"' : ''
        htmlParts.push('<img src="' + src + '"' + altAttr + titleAttr + ' />')
        return
      }
      if (Array.isArray(node.content) && node.content.length > 0) {
        const nested = serializeInline(node.content)
        if (nested.text) textParts.push(nested.text)
        if (nested.html) htmlParts.push(nested.html)
      }
    })

    return {
      text: textParts.join(''),
      html: htmlParts.join(''),
    }
  }

  const serializeListNode = (node: any): { htmlItems: string[]; textItems: string[] } => {
    const htmlItems: string[] = []
    const textItems: string[] = []

    if (!Array.isArray(node?.content)) {
      return { htmlItems, textItems }
    }

    node.content.forEach((item: any) => {
      if (!item || item.type !== 'listItem') return
      const htmlParts: string[] = []
      const textParts: string[] = []

      if (Array.isArray(item.content)) {
        item.content.forEach((child: any) => {
          if (child.type === 'paragraph') {
            const { text, html } = serializeInline(child.content)
            if (html) {
              htmlParts.push(html)
            } else if (text) {
              htmlParts.push(escapeHtml(text))
            }
            if (text) {
              textParts.push(text)
            }
          } else if (child.type === 'bulletList' || child.type === 'orderedList') {
            const nested = serializeListNode(child)
            if (nested.htmlItems.length > 0) {
              const tag = child.type === 'orderedList' ? 'ol' : 'ul'
              const nestedHtml = nested.htmlItems.map((li) => '<li>' + li + '</li>').join('')
              htmlParts.push('<' + tag + '>' + nestedHtml + '</' + tag + '>')
            }
            if (nested.textItems.length > 0) {
              textParts.push(nested.textItems.join('\n'))
            }
          }
        })
      }

      const htmlItem = htmlParts.join('<br />')
      const textItem = textParts.join('\n')
      htmlItems.push(htmlItem)
      textItems.push(textItem)
    })

    return { htmlItems, textItems }
  }

  const serializeNodeToHTML = (node: any, editorInstance?: any): string => {
    if (!editorInstance?.schema || typeof document === 'undefined') {
      return ''
    }
    try {
      const docJson = { type: 'doc', content: [node] }
      const docNode = editorInstance.schema.nodeFromJSON(docJson)
      const serializer = DOMSerializer.fromSchema(editorInstance.schema)
      const fragment = serializer.serializeFragment(docNode.content, { document })
      const container = document.createElement('div')
      container.appendChild(fragment)
      return container.innerHTML
    } catch (error) {
      console.warn('Failed to serialize table node', error)
      return ''
    }
  }

  // Parse HTML string to TipTap JSON nodes using an editor's schema
  const parseHtmlToNodes = (html: string, editorInstance?: any): any[] => {
    if (!html || !editorInstance?.schema || typeof document === 'undefined') return []
    try {
      const container = document.createElement('div')
      container.innerHTML = html
      const parser = ProseDOMParser.fromSchema(editorInstance.schema)
      const doc = parser.parse(container)
      if (doc?.content) {
        const nodes: any[] = []
        doc.content.forEach((node: any) => {
          nodes.push(node.toJSON())
        })
        return nodes
      }
      return []
    } catch (error) {
      console.warn('Failed to parse HTML to nodes:', error)
      return []
    }
  }

  const stripHtml = (value: string): string =>
    typeof value === 'string'
      ? value
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : ''

  const deriveCalloutVariant = (value: string): CalloutVariant => {
    const normalized = value.trim().toLowerCase()
    if (normalized.startsWith('tip:')) return 'tip'
    if (normalized.startsWith('warning:')) return 'warning'
    if (normalized.startsWith('info:')) return 'info'
    return 'info'
  }

  const stripVariantPrefix = (value: string, variant: CalloutVariant): string => {
    const prefixes: Record<CalloutVariant, string> = {
      info: 'info:',
      tip: 'tip:',
      warning: 'warning:',
    }
    const prefix = prefixes[variant]
    const trimmed = value.trim()
    if (!trimmed.toLowerCase().startsWith(prefix)) {
      return trimmed
    }
    const withoutPrefix = trimmed.slice(prefix.length)
    return withoutPrefix.replace(/^\s+/, '')
  }

  function bodyToDocument(body: any[] | undefined, language: 'en' | 'ar') {
    const textKey = language === 'ar' ? 'ar' : 'en'
    const titleKey = language === 'ar' ? 'title_ar' : 'title_en'
    const captionKey = language === 'ar' ? 'caption_ar' : 'caption_en'
    const htmlKey = language === 'ar' ? 'html_ar' : 'html_en'
    const itemsKey = language === 'ar' ? 'items_ar' : 'items_en'
    const jsonKey = language === 'ar' ? 'json_ar' : 'json_en'
    const nodes: any[] = []

    if (Array.isArray(body)) {
      body.forEach((item: any) => {
        if (!item || typeof item !== 'object') return
        const jsonNode = item[jsonKey]
        if (jsonNode) {
          nodes.push(cloneNode(jsonNode))
          return
        }
        const textValue = typeof item[textKey] === 'string' ? item[textKey] : ''
        switch (item.type) {
        case 'heading':
          nodes.push({
            type: 'heading',
            attrs: { level: Number(item.level) || 2 },
            content: textValue ? [{ type: 'text', text: textValue }] : [],
          })
          break
        case 'horizontalRule':
          nodes.push({ type: 'horizontalRule' })
          break
          case 'paragraph': {
            const htmlValue = typeof item[htmlKey] === 'string' ? item[htmlKey] : ''
            const plain = htmlValue ? stripHtml(htmlValue) : textValue
            nodes.push({
              type: 'paragraph',
              content: plain ? [{ type: 'text', text: plain }] : [],
            })
            break
          }
          case 'list': {
            const listItems = Array.isArray(item[itemsKey]) ? item[itemsKey] : []
            if (listItems.length > 0) {
              nodes.push({
                type: item.ordered ? 'orderedList' : 'bulletList',
                content: listItems.map((entry: any) => {
                  // Handle both string format and ListItem object format ({text, indent})
                  const rawText = typeof entry === 'string' ? entry : (entry?.text || '')
                  const text = stripHtml(rawText)
                  return {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: text ? [{ type: 'text', text }] : [],
                      },
                    ],
                  }
                }),
              })
            }
            break
          }
          case 'table': {
            const jsonNode = item[jsonKey]
            if (jsonNode && typeof jsonNode === 'object') {
              nodes.push(cloneNode(jsonNode))
            } else {
              // Fallback: parse table HTML (e.g., from Segment Editor)
              const tableHtml = typeof item[htmlKey] === 'string' ? item[htmlKey] : ''
              if (tableHtml) {
                const editor = language === 'ar' ? editorAr : editorEn
                const parsed = parseHtmlToNodes(tableHtml, editor)
                if (parsed.length > 0) {
                  parsed.forEach(n => nodes.push(n))
                }
              }
            }
            break
          }
          case 'imageSlider': {
            const jsonNode = item[jsonKey]
            if (jsonNode && typeof jsonNode === 'object') {
              nodes.push(cloneNode(jsonNode))
            } else {
              const images = Array.isArray(item.images) ? item.images.filter((src: string) => typeof src === 'string' && src.trim().length) : []
              if (images.length) {
                nodes.push({ type: 'imageSlider', attrs: { images } })
              }
            }
            break
          }
          case 'callout': {
            const variant = deriveCalloutVariant(textValue)
            const normalized = stripVariantPrefix(textValue, variant)
            nodes.push({
              type: 'blockquote',
              content: [
                {
                  type: 'paragraph',
                  content: normalized ? [{ type: 'text', text: normalized }] : [],
                },
              ],
            })
            break
          }
          case 'image':
            if (item.image) {
              const altSource =
                typeof item[titleKey] === 'string' && item[titleKey]
                  ? item[titleKey]
                  : typeof item[captionKey] === 'string'
                    ? item[captionKey]
                    : ''
              nodes.push({
                type: 'image',
                attrs: {
                  src: item.image,
                  alt: altSource || undefined,
                  title: altSource || undefined,
                  width: item.width || '100%',
                  align: item.align || 'center',
                },
              })
            }
            break
          case 'youtube':
            if (item.url) {
              nodes.push({
                type: 'youtube',
                attrs: {
                  src: item.url,
                  width: item.width || 640,
                  height: item.height || 360,
                },
              })
            }
            break
        case 'video':
          if (item.url) {
            const provider = item.provider || (item.url.includes('vimeo.com') ? 'vimeo' : null)
            nodes.push({
              type: 'video',
              attrs: {
                src: item.url,
                poster: item.poster || null,
                title: item[titleKey] || item[captionKey] || null,
                controls: provider === 'vimeo' ? false : true,
                provider,
              },
            })
          }
          break
          case 'code': {
            const codeText = typeof item[htmlKey] === 'string' ? stripHtml(item[htmlKey]) : textValue
            if (codeText) {
              nodes.push({
                type: 'codeBlock',
                attrs: { language: item.language || 'typescript' },
                content: [{ type: 'text', text: codeText }],
              })
            }
            break
          }
          default: {
            // Fallback: try to parse HTML if available
            const fallbackHtml = typeof item[htmlKey] === 'string' ? item[htmlKey] : ''
            if (fallbackHtml) {
              const editor = language === 'ar' ? editorAr : editorEn
              const parsed = parseHtmlToNodes(fallbackHtml, editor)
              if (parsed.length > 0) {
                parsed.forEach(n => nodes.push(n))
              } else if (textValue) {
                nodes.push({
                  type: 'paragraph',
                  content: [{ type: 'text', text: textValue }],
                })
              }
            } else if (textValue) {
              nodes.push({
                type: 'paragraph',
                content: [{ type: 'text', text: textValue }],
              })
            }
          }
        }
      })
    }

    if (nodes.length === 0) {
      nodes.push({ type: 'paragraph' })
    }

    return { type: 'doc', content: nodes }
  }

  useEffect(() => {
    if (meta.isNew) {
      loadedLessonKeyRef.current = null
      return
    }
    if (!editorEn || !editorAr) return
    if (!developerId) return

    const identifier = (meta.slug || meta.id || '').trim()
    if (!identifier) return
    const wikiSlug = (meta.wikiSlug || 'student-kit').trim() || 'student-kit'
    const cacheKey = `${wikiSlug}::${identifier}`
    if (loadedLessonKeyRef.current === cacheKey) return

    let cancelled = false

    const loadLesson = async () => {
      try {
        const headers = applyDeveloperHeader()
        const res = await fetch(
          `/api/lessons/${encodeURIComponent(identifier)}?kit=${encodeURIComponent(wikiSlug)}`,
          { cache: 'no-store', headers }
        )
        if (!res.ok) {
          console.error('Failed to load lesson content', res.status)
          setStatus('Failed to load lesson content.')
          return
        }
        const lesson = await res.json()
        if (cancelled) return

        loadedLessonKeyRef.current = cacheKey

        const body = Array.isArray(lesson?.body) ? lesson.body : []
        const hasArabicContent = body.some((block: any) => {
          if (!block || typeof block !== 'object') return false
          return Boolean(
            (typeof block.title_ar === 'string' && block.title_ar.trim()) ||
            (typeof block.caption_ar === 'string' && block.caption_ar.trim()) ||
            (typeof block.html_ar === 'string' && block.html_ar.trim()) ||
            (typeof block.ar === 'string' && block.ar.trim()) ||
            (Array.isArray(block.items_ar) && block.items_ar.length > 0) ||
            block.json_ar
          )
        })
        const docEn = bodyToDocument(body, 'en')
        const docAr = bodyToDocument(body, 'ar')

        syncingEnRef.current = true
        editorEn.commands.setContent(docEn, { emitUpdate: false })
        setTimeout(() => { syncingEnRef.current = false }, 0)

        syncingArRef.current = true
        editorAr.commands.setContent(docAr, { emitUpdate: false })
        setTimeout(() => { syncingArRef.current = false }, 0)

        if (hasArabicContent) {
           setIsVerified(true) // Auto-verify/unlock if we already have Arabic content
        } else {
           setIsVerified(false)
        }
        
        arabicDirtyRef.current = hasArabicContent
        forceArabicDirtyRender((prev) => !prev)
        setStatus((prev) => prev === 'Failed to load lesson content.' ? '' : prev)

        setMeta((prev: typeof meta) => {
          const next = { ...prev }
          let changed = false
          if (typeof lesson?.title_en === 'string' && lesson.title_en.trim() && lesson.title_en !== prev.title_en) {
            next.title_en = lesson.title_en
            changed = true
          }
          if (typeof lesson?.title_ar === 'string' && lesson.title_ar.trim() && lesson.title_ar !== prev.title_ar) {
            next.title_ar = lesson.title_ar
            changed = true
          }
          if (typeof lesson?.duration_min === 'number' && lesson.duration_min !== prev.duration_min) {
            next.duration_min = lesson.duration_min
            changed = true
          }
          if (typeof lesson?.difficulty === 'string' && lesson.difficulty.trim() && lesson.difficulty !== prev.difficulty) {
            next.difficulty = lesson.difficulty
            changed = true
          }
          if (typeof lesson?.coverImage === 'string' && lesson.coverImage.trim()) {
            const trimmedCover = lesson.coverImage.trim()
            if (trimmedCover !== prev.coverImage) {
              next.coverImage = trimmedCover
              changed = true
            }
          }
          if (typeof lesson?.order === 'number' && lesson.order !== prev.order) {
            next.order = lesson.order
            changed = true
          }
          if (typeof lesson?.ownerId === 'string' && lesson.ownerId.trim() && lesson.ownerId !== prev.ownerId) {
            next.ownerId = lesson.ownerId.trim()
            changed = true
          }
          if (next.isNew) {
            next.isNew = false
            changed = true
          }
          return changed ? next : prev
        })
      } catch (error) {
        if (cancelled) return
        console.error('Error loading lesson content', error)
        setStatus('Failed to load lesson content.')
      }
    }

    loadLesson()

    return () => {
      cancelled = true
    }
  }, [editorEn, editorAr, meta.isNew, meta.slug, meta.id, meta.wikiSlug, developerId])

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
        setMeta((m: typeof meta) => {
          const next = {
            ...m,
            ...parsed,
            wikiSlug: parsed.wikiSlug || m.wikiSlug || 'student-kit',
          }
          if (typeof parsed.isNew === 'boolean') {
            next.isNew = parsed.isNew
          }
          return next
        })
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
        setMeta((m: typeof meta) => {
          const next = { ...m, title_en: h1 }
          try { sessionStorage.setItem('lessonMeta', JSON.stringify(next)) } catch {}
          return next
        })
      }
    }
    editorEn.on('update', handler)
    return () => { editorEn.off('update', handler) }
  }, [editorEn])

  useEffect(() => {
    if (!editorAr) return
    const handler = () => {
      if (syncingArRef.current) return
      arabicDirtyRef.current = true
      forceArabicDirtyRender((prev) => !prev)
      const h1 = getFirstHeadingText(editorAr)
      if (h1) {
        setMeta((m: typeof meta) => {
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
    if (!current || current === 'Untitled') {
      applyTitleToDocument(editorEn, preferred)
    }
  }, [editorEn, meta.title_en, meta.title_ar, meta.slug, meta.id])

  useEffect(() => {
    if (!editorAr) return
    if (!isVerified) return // Don't auto-insert title if locked/empty
    if (arabicDirtyRef.current) return
    const preferred = (meta.title_ar || meta.title_en || meta.slug || meta.id || '').trim()
    if (!preferred) return
    const current = getFirstHeadingText(editorAr)
    if (!current || current === 'Untitled') {
      applyTitleToDocument(editorAr, preferred)
    }
  }, [editorAr, meta.title_ar, meta.title_en, meta.slug, meta.id, isVerified])

  useEffect(() => {
    const slug = typeof meta.slug === 'string' ? meta.slug.trim() : ''
    const id = typeof meta.id === 'string' ? meta.id.trim() : ''
    if (!slug && !id) return
    try { sessionStorage.setItem('lessonMeta', JSON.stringify(meta)) } catch {}
  }, [meta])

  const supportsColorEn = useMemo(() => Boolean(editorEn?.schema?.marks?.textStyle), [editorEn])
  const supportsColorAr = useMemo(() => Boolean(editorAr?.schema?.marks?.textStyle), [editorAr])
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

  function extractBody(doc: any, language: 'en' | 'ar', editorInstance?: any) {
    const blocks: any[] = []
    const textKey = language === 'ar' ? 'ar' : 'en'
    const htmlKey = language === 'ar' ? 'html_ar' : 'html_en'
    const titleKey = language === 'ar' ? 'title_ar' : 'title_en'
    const captionKey = language === 'ar' ? 'caption_ar' : 'caption_en'
    const itemsKey = language === 'ar' ? 'items_ar' : 'items_en'
    const jsonKey = language === 'ar' ? 'json_ar' : 'json_en'

    const handleNode = (node: any) => {
      if (!node || typeof node !== 'object') return
      switch (node.type) {
        case 'paragraph': {
          const { text, html } = serializeInline(node.content)
          if (!text && !html) {
            break
          }
          const block: any = {
            type: 'paragraph',
            [textKey]: (text || '').trim(),
            [jsonKey]: cloneNode(node),
          }
          if (html) {
            block[htmlKey] = html
          }
          blocks.push(block)
          break
        }
        case 'blockquote': {
          const htmlParts: string[] = []
          const textParts: string[] = []
          if (Array.isArray(node.content)) {
            node.content.forEach((child: any) => {
              if (child?.type === 'paragraph') {
                const { text, html } = serializeInline(child.content)
                if (html) {
                  htmlParts.push(html)
                }
                if (text) {
                  textParts.push(text)
                }
              }
            })
          }
          const rawText = textParts.join('\n').trim()
          if (!rawText) {
            break
          }
          const variant = deriveCalloutVariant(rawText)
          const normalized = stripVariantPrefix(rawText, variant)
          const block: any = {
            type: 'callout',
            variant,
            [textKey]: normalized,
            [jsonKey]: cloneNode(node),
          }
          if (htmlParts.length > 0) {
            block[htmlKey] = htmlParts.join('<br />')
          }
          blocks.push(block)
          break
        }
        case 'heading': {
            const { text, html } = serializeInline(node.content)
            if (!text) {
              break
            }
            const block: any = {
              type: 'heading',
              level: Number(node.attrs?.level) || 2,
              [textKey]: text.trim(),
              [jsonKey]: cloneNode(node),
            }
            if (html && html !== escapeHtml(text.trim())) {
              block[htmlKey] = html
            }
            blocks.push(block)
            break
          }
          case 'horizontalRule': {
            blocks.push({
              type: 'horizontalRule',
              [jsonKey]: cloneNode(node),
            })
            break
          }
        case 'bulletList':
        case 'orderedList': {
          const { htmlItems, textItems } = serializeListNode(node)
          if (htmlItems.length === 0 && textItems.length === 0) {
            break
          }
          const block: any = {
            type: 'list',
            ordered: node.type === 'orderedList',
            [itemsKey]: htmlItems,
            [textKey]: textItems.join('\n'),
            [jsonKey]: cloneNode(node),
          }
          blocks.push(block)
          break
        }
        case 'table': {
          const block: any = {
            type: 'table',
            [jsonKey]: cloneNode(node),
          }
          const html = serializeNodeToHTML(node, editorInstance)
          if (html) {
            block[htmlKey] = html
          }
          blocks.push(block)
          break
        }
        case 'imageSlider': {
          const images = Array.isArray(node.attrs?.images) ? node.attrs.images.filter((src: string) => typeof src === 'string' && src.trim().length) : []
          const block: any = {
            type: 'imageSlider',
            images,
            [jsonKey]: cloneNode(node),
          }
          const html = serializeNodeToHTML(node, editorInstance)
          if (html) {
            block[htmlKey] = html
          }
          blocks.push(block)
          break
        }
        case 'image': {
          const src = node.attrs?.src
          if (!src) break
          const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt.trim() : ''
          const title = typeof node.attrs?.title === 'string' ? node.attrs.title.trim() : ''
          const block: any = {
            type: 'image',
            image: src,
            width: node.attrs?.width,
            align: node.attrs?.align,
            [jsonKey]: cloneNode(node),
          }
          if (alt) {
            block[titleKey] = alt
            block[captionKey] = block[captionKey] || alt
          }
          if (title) {
            block[titleKey] = block[titleKey] || title
            block[captionKey] = block[captionKey] || title
          }
          blocks.push(block)
          break
        }
        case 'youtube': {
          const url = node.attrs?.src
          if (!url) break
          const block: any = {
            type: 'youtube',
            url,
            width: node.attrs?.width ? Number(node.attrs.width) : undefined,
            height: node.attrs?.height ? Number(node.attrs.height) : undefined,
            [jsonKey]: cloneNode(node),
          }
          blocks.push(block)
          break
        }
        case 'video': {
          const url = node.attrs?.src
          if (!url) break
          const provider = node.attrs?.provider || (typeof url === 'string' && url.includes('vimeo.com') ? 'vimeo' : undefined)
          const block: any = {
            type: 'video',
            url,
            poster: node.attrs?.poster || undefined,
            [titleKey]: node.attrs?.title ? String(node.attrs.title) : undefined,
            provider,
            [jsonKey]: cloneNode(node),
          }
          blocks.push(block)
          break
        }
        case 'codeBlock': {
          const { text, html } = serializeInline(node.content)
          if (!text) break
          const block: any = {
            type: 'code',
            language: node.attrs?.language || 'typescript',
            [textKey]: text,
            [jsonKey]: cloneNode(node),
          }
          if (html) {
             block[htmlKey] = html
          }
          blocks.push(block)
          break
        }
        default: {
          if (Array.isArray(node.content)) {
            node.content.forEach((child: any) => handleNode(child))
          }
          break
        }
      }
    }

    if (Array.isArray(doc?.content)) {
      doc.content.forEach((node: any) => handleNode(node))
    }

    return blocks
  }

  async function publish(statusOverride?: 'draft' | 'published') {
    if (!editorEn || !editorAr) return
    if (!meta.wikiSlug) {
      setStatus('Missing wiki selection. Open the properties panel to choose a wiki.')
      return
    }
    setStatus('')
    const docEn = editorEn.getJSON()
    const docAr = editorAr.getJSON()
    const bodyEn = extractBody(docEn, 'en', editorEn)
    const bodyAr = extractBody(docAr, 'ar', editorAr)
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
    const baseSlug = slugify(titleEn) || 'lesson'
    const uniqueToken = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const generatedId = meta.isNew ? `${baseSlug}-${uniqueToken}` : ((meta.id && meta.id.trim()) || baseSlug)
    const generatedSlug = meta.isNew ? `${baseSlug}-${uniqueToken}` : ((meta.slug && meta.slug.trim()) || baseSlug)
    
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
      coverImage: meta.coverImage?.trim() || '',
      duration_min: Number(meta.duration_min) || 30,
      difficulty: meta.difficulty,
      prerequisites_en: [],
      prerequisites_ar: [],
      materials: [],
      body: mergedBody,
      forceNew: meta.isNew === true,
    }
    try {
      if (!developerId) {
        setStatus('Please sign in as a content developer before saving.')
        return
      }

      const desiredStatus = statusOverride && isAdmin ? statusOverride : 'draft'

      if (saveDisabled) {
        setStatus('You can only edit lessons you own (or admin).')
        return
      }

      const headers = applyDeveloperHeader({ 'Content-Type': 'application/json' })
      const payloadWithOwner = {
        ...payload,
        ownerId: meta.ownerId || developerId || '',
        status: desiredStatus,
      }
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadWithOwner),
      })
      const data = await res.json()

      if (!res.ok) {
        console.error('API Error:', data)
        const detail = Array.isArray(data.missing) && data.missing.length ? ` (missing: ${data.missing.join(', ')})` : ''
        throw new Error((data.error || 'Failed') + detail)
      }

      const savedLesson = data?.lesson ?? {}
      const isUpdate = Boolean(data?.isUpdate)

      const updatedMeta = {
        ...meta,
        id: typeof savedLesson.id === 'string' && savedLesson.id.trim() ? savedLesson.id : generatedId,
        slug: typeof savedLesson.slug === 'string' && savedLesson.slug.trim() ? savedLesson.slug : generatedSlug,
        order: typeof savedLesson.order === 'number' ? savedLesson.order : meta.order,
        isNew: false,
        ownerId: typeof savedLesson.ownerId === 'string' && savedLesson.ownerId.trim()
          ? savedLesson.ownerId
          : meta.ownerId || developerId || '',
      }

      setMeta(updatedMeta)
      try {
        sessionStorage.setItem('lessonMeta', JSON.stringify(updatedMeta))
      } catch {}

      const params = new URLSearchParams(searchParams?.toString() ?? '')
      params.set('slug', updatedMeta.slug)
      params.set('id', updatedMeta.id)
      if (updatedMeta.wikiSlug) {
        params.set('wiki', updatedMeta.wikiSlug)
      }
      params.delete('new')
      router.replace(`/editor/lesson?${params.toString()}`)

      const slugOrIdChanged = updatedMeta.slug !== generatedSlug || updatedMeta.id !== generatedId
      if (!isUpdate && slugOrIdChanged) {
        setStatus(desiredStatus === 'published' ? `Lesson published! Saved as "${updatedMeta.slug}".` : 'Changes saved!')
      } else {
        setStatus(desiredStatus === 'published' ? 'Lesson published!' : isUpdate ? 'Changes saved!' : 'Lesson saved!')
      }
  } catch (e: any) {
    console.error('Publish error:', e)
    setStatus(`Error: ${e.message}`)
  }
}

  if (isSigningIn) {
    return <DeveloperLogin onSignedIn={handleDeveloperSignedIn} />
  }

  return (
    <div className="revolutionary-editor-container">
      <div className="revolutionary-editor-wrapper">
        {/* Top Toolbar - Glassmorphic */}
        <div className="glass-top-toolbar mb-6">
          <div className="glass-top-toolbar-left">
            <div className="glass-top-toolbar-title">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                <Globe size={10} />
                {meta.wikiSlug && <span>{meta.wikiSlug}</span>}
                <span>/</span>
                <span>Editor</span>
              </div>
              <input
                type="text"
                value={meta.title_en || ''}
                onChange={(e) => {
                  const val = e.target.value
                  setMeta((m: typeof meta) => {
                    const next = { ...m, title_en: val }
                    try { sessionStorage.setItem('lessonMeta', JSON.stringify(next)) } catch {}
                    return next
                  })
                }}
                placeholder="Untitled Lesson"
                className="text-lg font-bold text-slate-900 leading-none bg-transparent border-none outline-none w-full placeholder:text-slate-300 hover:bg-white/50 focus:bg-white/80 rounded px-1 -mx-1 py-0.5 transition-colors"
                style={{ fontSize: '1.125rem' }}
              />
              {meta.slug && (
                <div className="glass-top-toolbar-meta" style={{ marginTop: '2px' }}>
                  <span>{meta.slug}</span>
                </div>
              )}
            </div>
          </div>
          <div className="glass-top-toolbar-right">
            {status && (
              <div className="glass-status">
                <span className="glass-status-dot" />
                {status}
              </div>
            )}
            {meta.slug && (
              <button
                className="glass-btn glass-btn-secondary mr-2"
                onClick={() => window.open(`/wiki/${meta.wikiSlug || 'student-kit'}/${meta.slug}`, '_blank')}
                title="Preview in new tab"
                type="button"
              >
                <Eye className="inline w-4 h-4 mr-1" /> Preview
              </button>
            )}
            <button
              className="glass-btn glass-btn-secondary"
              onClick={() => publish('draft')}
              disabled={saveDisabled}
              title={saveDisabled ? 'Only the owner or admin can save this lesson' : 'Save as draft'}
              type="button"
            >
              <Save className="inline w-4 h-4 mr-1" /> Save Draft
            </button>
            <button
              className="glass-btn glass-btn-success"
              onClick={() => setShowPublishModal(true)}
              disabled={!isAdmin}
              title="Only admins can publish"
              type="button"
            >
              <Rocket className="inline w-4 h-4 mr-1" /> Publish
            </button>
          </div>
        </div>

        <div className="revolutionary-editor-grid">
          {/* English Editor Pane */}
          <div className="glass-editor-panel">
            <div className="glass-editor-header">
              <div className="glass-editor-header-title">
                <span className="glass-lang-indicator en">EN</span>
                <span>English</span>
                <span className="text-slate-400 text-xs font-normal">• Left to Right</span>
              </div>
              <div className="glass-shortcut-hint">
                Press <span className="glass-shortcut-key">/</span> for commands
              </div>
            </div>
            
            <div className="glass-editor-content">
              {/* Table Bubble Menu */}
              <div id={bubbleIdEn} className="glass-bubble-menu" style={{ position: 'absolute', left: -9999, top: -9999, visibility: 'hidden' }}>
                <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().addRowBefore().run()} title="Add row above">↑+</button>
                <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().addRowAfter().run()} title="Add row below">↓+</button>
                <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().addColumnBefore().run()} title="Add column left">←+</button>
                <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().addColumnAfter().run()} title="Add column right">→+</button>
                <span className="glass-bubble-divider" />
                <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().deleteRow().run()} title="Delete row" style={{color: '#ef4444'}}>⊖</button>
                <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().deleteColumn().run()} title="Delete column" style={{color: '#ef4444'}}>⊝</button>
                <span className="glass-bubble-divider" />
                <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().toggleHeaderRow().run()} title="Toggle header row">H̲</button>
                <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().mergeCells().run()} title="Merge cells">⊞</button>
                <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().splitCell().run()} title="Split cell">⊟</button>
                <span className="glass-bubble-divider" />
                {tableColors.map(c => (
                  <button key={c.name} className="glass-bubble-color" style={{ background: c.value || '#f8fafc' }} onClick={() => editorEn?.chain().focus().setCellAttribute('backgroundColor', c.value || null).run()} title={c.name} />
                ))}
                <span className="glass-bubble-divider" />
                <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().deleteTable().run()} title="Delete table" style={{color: '#dc2626'}}><Trash2 className="inline w-3.5 h-3.5" /></button>
              </div>

              {/* Text Bubble Menu */}
              <div id={textBubbleIdEn} className="glass-bubble-menu" style={{ position: 'absolute', left: -9999, top: -9999, visibility: 'hidden' }}>
                <button className="glass-bubble-btn" style={{fontWeight: 700}} onClick={() => editorEn?.chain().focus().toggleBold().run()} title="Bold">B</button>
                <button className="glass-bubble-btn" style={{fontStyle: 'italic'}} onClick={() => editorEn?.chain().focus().toggleItalic().run()} title="Italic">I</button>
                <button className="glass-bubble-btn" style={{textDecoration: 'underline'}} onClick={() => editorEn?.chain().focus().toggleUnderline().run()} title="Underline">U</button>
                <button className="glass-bubble-btn" style={{textDecoration: 'line-through'}} onClick={() => editorEn?.chain().focus().toggleStrike().run()} title="Strikethrough">S</button>
                <span className="glass-bubble-divider" />
                <button className="glass-bubble-btn" onClick={() => promptForLink(editorEn)} title="Add link"><Link2 className="inline w-3.5 h-3.5" /></button>
                <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().unsetLink().run()} title="Remove link"><Unlock className="inline w-3.5 h-3.5" /></button>
                <span className="glass-bubble-divider" />
                {textColors.map(col => (
                  <button key={col} className="glass-bubble-color" style={{ background: col }} onClick={() => { if (!editorEn || !supportsColorEn) return; editorEn.chain().focus().setColor(col).run() }} title="Text color" />
                ))}
                <button className="glass-bubble-btn text-xs" onClick={() => supportsColorEn ? editorEn?.chain().focus().unsetColor().run() : undefined} title="Clear color"><X className="inline w-3 h-3" /></button>
                <span className="glass-bubble-divider" />
                {highlightColors.map(col => (
                  <button key={col} className="glass-bubble-color" style={{ background: col }} onClick={() => { if (!editorEn) return; editorEn.chain().focus().toggleHighlight({ color: col }).run() }} title="Highlight" />
                ))}
                <button className="glass-bubble-btn text-xs" onClick={() => editorEn?.chain().focus().unsetHighlight().run()} title="Clear highlight"><X className="inline w-3 h-3" /></button>
              </div>

              <EditorContent editor={editorEn} />
            </div>
          </div>

          {/* Arabic Editor Pane */}
          <div className={`glass-editor-panel ${!isVerified ? 'glass-editor-locked' : ''}`}>
            <div className="glass-editor-header">
              <div className="glass-editor-header-title">
                <span className="glass-lang-indicator ar">AR</span>
                <span>العربية</span>
                <span className="text-slate-400 text-xs font-normal">• Right to Left</span>
              </div>
              <div className="flex items-center gap-3">
                {!isVerified ? (
                  <button onClick={() => setShowVerifyModal(true)} className="glass-verify-btn" title="Verify English and unlock Arabic">
                    <Unlock className="inline w-4 h-4 mr-1" /> Verify & Mirror
                  </button>
                ) : (
                  <span className="glass-editor-header-badge synced"><Check className="inline w-3.5 h-3.5 mr-0.5" /> Unlocked</span>
                )}
              </div>
            </div>
            
            <div className="glass-editor-content">
              {arabicDirtyRef.current && (
                <div className="glass-sync-ribbon needs-sync">
                  <AlertTriangle className="inline w-3.5 h-3.5 mr-1" /> Arabic content has diverged from English
                </div>
              )}
              {/* Table Bubble Menu AR */}
              <div id={bubbleIdAr} className="glass-bubble-menu" style={{ position: 'absolute', left: -9999, top: -9999 }}>
                <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().addRowBefore().run()} title="Add row above">↑+</button>
                <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().addRowAfter().run()} title="Add row below">↓+</button>
                <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().addColumnBefore().run()} title="Add column left">←+</button>
                <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().addColumnAfter().run()} title="Add column right">→+</button>
                <span className="glass-bubble-divider" />
                <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().deleteRow().run()} title="Delete row" style={{color: '#ef4444'}}>⊖</button>
                <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().deleteColumn().run()} title="Delete column" style={{color: '#ef4444'}}>⊝</button>
                <span className="glass-bubble-divider" />
                <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().toggleHeaderRow().run()} title="Toggle header row">H̲</button>
                <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().mergeCells().run()} title="Merge cells">⊞</button>
                <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().splitCell().run()} title="Split cell">⊟</button>
                <span className="glass-bubble-divider" />
                {tableColors.map(c => (
                  <button key={c.name} className="glass-bubble-color" style={{ background: c.value || '#f8fafc' }} onClick={() => editorAr?.chain().focus().setCellAttribute('backgroundColor', c.value || null).run()} title={c.name} />
                ))}
                <span className="glass-bubble-divider" />
                <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().deleteTable().run()} title="Delete table" style={{color: '#dc2626'}}><Trash2 className="inline w-3.5 h-3.5" /></button>
              </div>

              {/* Text Bubble Menu AR */}
              <div id={textBubbleIdAr} className="glass-bubble-menu" style={{ position: 'absolute', left: -9999, top: -9999 }}>
                <button className="glass-bubble-btn" style={{fontWeight: 700}} onClick={() => editorAr?.chain().focus().toggleBold().run()} title="Bold">B</button>
                <button className="glass-bubble-btn" style={{fontStyle: 'italic'}} onClick={() => editorAr?.chain().focus().toggleItalic().run()} title="Italic">I</button>
                <button className="glass-bubble-btn" style={{textDecoration: 'underline'}} onClick={() => editorAr?.chain().focus().toggleUnderline().run()} title="Underline">U</button>
                <button className="glass-bubble-btn" style={{textDecoration: 'line-through'}} onClick={() => editorAr?.chain().focus().toggleStrike().run()} title="Strikethrough">S</button>
                <span className="glass-bubble-divider" />
                <button className="glass-bubble-btn" onClick={() => promptForLink(editorAr)} title="Add link"><Link2 className="inline w-3.5 h-3.5" /></button>
                <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().unsetLink().run()} title="Remove link"><Unlock className="inline w-3.5 h-3.5" /></button>
                <span className="glass-bubble-divider" />
                {textColors.map(col => (
                  <button key={col} className="glass-bubble-color" style={{ background: col }} onClick={() => { if (!editorAr || !supportsColorAr) return; editorAr.chain().focus().setColor(col).run() }} title="Text color" />
                ))}
                <button className="glass-bubble-btn text-xs" onClick={() => supportsColorAr ? editorAr?.chain().focus().unsetColor().run() : undefined} title="Clear color"><X className="inline w-3 h-3" /></button>
                <span className="glass-bubble-divider" />
                {highlightColors.map(col => (
                  <button key={col} className="glass-bubble-color" style={{ background: col }} onClick={() => { if (!editorAr) return; editorAr.chain().focus().toggleHighlight({ color: col }).run() }} title="Highlight" />
                ))}
                <button className="glass-bubble-btn text-xs" onClick={() => editorAr?.chain().focus().unsetHighlight().run()} title="Clear highlight"><X className="inline w-3 h-3" /></button>
              </div>

              <EditorContent editor={editorAr} />
            </div>
          </div>
        </div>
      </div>

      {/* Verify & Mirror Confirmation Modal */}
      <AnimatePresence>
        {showVerifyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setShowVerifyModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-slate-50 px-8 py-6 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Unlock className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Verify & Unlock Arabic</h3>
                </div>
                <p className="text-sm text-slate-500">Please confirm the English content is finalized before mirroring it to the Arabic editor.</p>
              </div>

              {/* Checkpoints */}
              <div className="p-8 space-y-4">
                {[
                  { id: 'content', title: 'Content Completeness', desc: 'All English content has been written and finalized. No placeholder text or missing sections remain.' },
                  { id: 'structure', title: 'Structural Accuracy', desc: 'Headings, lists, images, and media are correctly placed and properly formatted.' },
                  { id: 'readability', title: 'Readability & Quality', desc: 'The text has been proofread for grammar, spelling, and clarity. It is ready for translation.' }
                ].map((item, idx) => {
                  const isChecked = (verifyCheckpoints as any)[item.id]
                  return (
                    <motion.label
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${isChecked ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                    >
                      <div className="mt-1 relative flex items-center justify-center w-6 h-6">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setVerifyCheckpoints(prev => ({ ...prev, [item.id]: e.target.checked }))}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <motion.div
                          initial={false}
                          animate={{
                            backgroundColor: isChecked ? 'rgb(59 130 246)' : 'rgb(255 255 255)',
                            borderColor: isChecked ? 'rgb(59 130 246)' : 'rgb(226 232 240)',
                            scale: isChecked ? [1, 1.15, 1] : 1
                          }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center justify-center w-6 h-6 border-2 rounded-lg shadow-sm"
                        >
                          {isChecked && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <Check className="text-white" size={14} strokeWidth={4} />
                            </motion.div>
                          )}
                        </motion.div>
                        {isChecked && (
                          <motion.div
                            initial={{ x: '-100%', opacity: 0 }}
                            animate={{ x: '200%', opacity: [0, 0.5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12 pointer-events-none"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors uppercase tracking-tight">{item.title}</div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                      {isChecked && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent pointer-events-none"
                        />
                      )}
                    </motion.label>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setShowVerifyModal(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!Object.values(verifyCheckpoints).every(Boolean)}
                  onClick={() => {
                    setShowVerifyModal(false)
                    handleVerifyAndMirror()
                  }}
                  className="group relative px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200/50 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none disabled:bg-slate-300 transition-all active:scale-95 overflow-hidden"
                >
                  <span className="relative z-10">Confirm & Unlock Arabic</span>
                  {!Object.values(verifyCheckpoints).every(Boolean) ? null : (
                    <motion.div
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                    />
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Publish Confirmation Modal */}
      <AnimatePresence>
        {showPublishModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setShowPublishModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-slate-50 px-8 py-6 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Globe className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Publish to Wiki</h3>
                </div>
                <p className="text-sm text-slate-500">Please complete the following quality assurance checkpoints before making this lesson live.</p>
              </div>

              {/* Checkpoints */}
              <div className="p-8 space-y-4">
                {[
                  { id: 'linguistic', title: 'Linguistic & Content Accuracy', desc: 'Verified that both English and Arabic translations are accurate and properly contextualized.' },
                  { id: 'media', title: 'Visual & Media Audit', desc: 'Confirmed all images, sliders, and video assets are present, optimized, and correctly placed.' },
                  { id: 'ux', title: 'UX & Design Validation', desc: 'Inspected the lesson in Preview Mode to ensure perfect layout, responsiveness, and design excellence.' },
                  { id: 'flow', title: 'Instructional Continuity', desc: 'Validated the logical flow, educational sequence, and curriculum alignment of the lesson.' }
                ].map((item, idx) => {
                  const isChecked = (publishCheckpoints as any)[item.id]
                  return (
                    <motion.label
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${isChecked ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                    >
                      <div className="mt-1 relative flex items-center justify-center w-6 h-6">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => setPublishCheckpoints(prev => ({ ...prev, [item.id]: e.target.checked }))}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <motion.div 
                          initial={false}
                          animate={{ 
                            backgroundColor: isChecked ? 'rgb(16 185 129)' : 'rgb(255 255 255)',
                            borderColor: isChecked ? 'rgb(16 185 129)' : 'rgb(226 232 240)',
                            scale: isChecked ? [1, 1.15, 1] : 1
                          }}
                          transition={{ duration: 0.3 }}
                          className="flex items-center justify-center w-6 h-6 border-2 rounded-lg shadow-sm"
                        >
                          {isChecked && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <Check className="text-white" size={14} strokeWidth={4} />
                            </motion.div>
                          )}
                        </motion.div>
                        {/* Shine effect for checkbox */}
                        {isChecked && (
                          <motion.div 
                            initial={{ x: '-100%', opacity: 0 }}
                            animate={{ x: '200%', opacity: [0, 0.5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12 pointer-events-none"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors uppercase tracking-tight">{item.title}</div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                      
                      {/* Subtle background shine for the whole card when checked */}
                      {isChecked && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent pointer-events-none"
                        />
                      )}
                    </motion.label>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={!Object.values(publishCheckpoints).every(Boolean)}
                  onClick={() => {
                    setShowPublishModal(false)
                    publish('published')
                  }}
                  className="group relative px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200/50 hover:bg-emerald-700 disabled:opacity-50 disabled:shadow-none disabled:bg-slate-300 transition-all active:scale-95 overflow-hidden"
                >
                  <span className="relative z-10">Confirm & Publish Now</span>
                  {!Object.values(publishCheckpoints).every(Boolean) ? null : (
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                    />
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}








