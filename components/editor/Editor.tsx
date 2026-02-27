"use client"
import NextLink from 'next/link'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EditorContent, useEditor, ReactNodeViewRenderer } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { posToDOMRect, isTextSelection } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Heading from '@tiptap/extension-heading'
import Image from './extensions/ResizableImage'
import Youtube from '@tiptap/extension-youtube'
import YoutubeComponent from './extensions/YoutubeComponent'
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
import { SafeBubbleMenu } from './extensions/SafeBubbleMenu'
import { DOMSerializer, DOMParser as ProseDOMParser } from 'prosemirror-model'
import { SlashCommand } from './SlashCommand'
import TableCellWithBackground from './extensions/TableCellWithBackground'
import Video from './extensions/Video'
import ImageSlider from './extensions/ImageSlider'
import { CellSelection } from '@tiptap/pm/tables'
import { Columns, Column } from './extensions/Columns'
import CodeBlockView from './CodeBlockView'
import type { EditorView } from '@tiptap/pm/view'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles, Save, Rocket, Trash2, Link2, Unlock, X, Check, AlertTriangle, ShieldAlert, Globe, Eye, Languages, Settings, Image as ImageIcon, UploadCloud, Loader2, ArrowLeft, ArrowRight, Download, Upload, ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine, MinusCircle, Merge, Split, Heading as HeadingIcon } from 'lucide-react'
import './hljs.css'
import { applyDeveloperHeader, getDeveloperId, rememberDeveloperId } from './dev-identity'
import DeveloperLogin from './DeveloperLogin'
import Sidebar from '../sidebar'
import { HUB_DOMAIN } from '@/lib/domains'

const ENABLE_SEGMENTS_EDITOR = false

// Stable reference for BubbleMenu to prevent flickering on Editor renders
const bubbleMenuOptions: any = { placement: 'top', offset: 8 };

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
  const target = event.target
  const targetCell = (target instanceof Element) ? target.closest('td, th') : null
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
  const target = event.target
  if (target instanceof Element && target.closest('table')) {
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
  const [developer, setDeveloper] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [tocTrigger, setTocTrigger] = useState(0)
  const [autosaveProgress, setAutosaveProgress] = useState(0)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
      status: 'draft',
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
        } catch { }

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
        } catch { }

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
      } catch { }
    }
    return base
  })
  const metaRef = useRef(meta)
  useEffect(() => {
    metaRef.current = meta
  }, [meta])

  // --- Document Lock State ---
  const [isLockedByOther, setIsLockedByOther] = useState(false)
  const [lockedBy, setLockedBy] = useState<string | null>(null)
  const [documentVersion, setDocumentVersion] = useState<number>(meta.version || 1)
  // ---------------------------

  // Logic to determine if user has permission to edit this wiki
  const hasWikiAccess = useMemo(() => {
    if (!developer) return false
    if (developer.role === 'admin' || developer.role === 'superadmin') return true
    const currentWiki = meta.wikiSlug || 'student-kit'
    return Boolean(developer.wikiSlugs?.includes(currentWiki))
  }, [developer, meta.wikiSlug])

  // --- Document Lock Heartbeat ---
  // Use a ref to track whether WE currently own the lock (for cleanup)
  const weOwnLockRef = useRef(false)

  useEffect(() => {
    // Only attempt to lock if we have a saved lesson ID + a loaded developer + wiki access
    if (!meta.id || !developerId || !hasWikiAccess) return

    let isMounted = true

    const pingLock = async () => {
      try {
        const res = await fetch('/api/lessons/lock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...applyDeveloperHeader()
          },
          body: JSON.stringify({
            wikiSlug: meta.wikiSlug,
            lessonId: meta.id,
          })
        })

        const data = await res.json()
        if (!isMounted) return

        if (res.ok) {
          if (data.locked) {
            // Someone else holds the lock
            setIsLockedByOther(true)
            setLockedBy(data.lockedBy || 'Another developer')
            weOwnLockRef.current = false
          } else {
            // We successfully acquired/renewed the lock
            setIsLockedByOther(false)
            setLockedBy(null)
            weOwnLockRef.current = true
          }
          // Update local version to stay in sync
          if (typeof data.version === 'number') {
            setDocumentVersion(data.version)
          }
        }
      } catch (err) {
        console.error('Lock ping failed', err)
      }
    }

    // Attempt to release lock helper (uses ref, not stale closure)
    const releaseLock = () => {
      if (weOwnLockRef.current) {
        const url = `/api/lessons/lock?wiki=${meta.wikiSlug}&id=${meta.id}`
        fetch(url, {
          method: 'DELETE',
          headers: applyDeveloperHeader(),
          keepalive: true
        }).catch(() => { })
        weOwnLockRef.current = false
      }
    }

    // Ping immediately on mount
    pingLock()

    // Ping every 30 seconds to renew lock (and also re-check if the other user left)
    const interval = setInterval(pingLock, 30000)

    // Add beforeunload listener to release lock immediately on tab close
    window.addEventListener('beforeunload', releaseLock)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener('beforeunload', releaseLock)
      releaseLock()
    }
  }, [meta.id, meta.wikiSlug, developerId, hasWikiAccess])
  const handleTakeover = async () => {
    try {
      const res = await fetch('/api/lessons/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...applyDeveloperHeader()
        },
        body: JSON.stringify({
          wikiSlug: meta.wikiSlug,
          lessonId: meta.id,
          forceTakeover: true
        })
      })
      if (res.ok) {
        setIsLockedByOther(false)
        setLockedBy(null)
        weOwnLockRef.current = true
      }
    } catch (err) {
      console.error('Takeover failed', err)
    }
  }

  const handleConfirmEditPublished = () => {
    setMeta((prev: any) => ({ ...prev, status: 'draft' }))
    setShowDraftConfirmation(false)
    setStatus('Lesson status reverted to Draft for editing.')
  }
  // -------------------------------
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
        if (res.ok && data?.developer) {
          setDeveloper(data.developer)
          setIsAdmin(data.developer.role === 'admin' || data.developer.role === 'superadmin')
        } else {
          setDeveloper(null)
          setIsAdmin(false)
        }
      } catch {
        if (!cancelled) {
          setDeveloper(null)
          setIsAdmin(false)
        }
      }
    }
    loadRole()
    return () => {
      cancelled = true
    }
  }, [developerId])


  const isSuperAdmin = developer?.role === 'superadmin'
  const isEditor = developer?.role === 'editor'
  const isOwner = Boolean(meta.ownerId && developerId && String(meta.ownerId) === String(developerId))

  const canEdit = !isLockedByOther && (isSuperAdmin || (hasWikiAccess && (isAdmin || (isEditor && (isOwner || !meta.ownerId || !!meta.isNew)))))
  const saveDisabled = !canEdit

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

  // Confirmation for editing published lessons
  const [showDraftConfirmation, setShowDraftConfirmation] = useState(false)

  const [activeEditorTab, setActiveEditorTab] = useState<'en' | 'ar'>('en')
  const activeTabRef = useRef(activeEditorTab)
  useEffect(() => {
    activeTabRef.current = activeEditorTab
  }, [activeEditorTab])

  const shouldShowTableEn = useCallback(({ editor }: any) => {
    if (activeEditorTab !== 'en') return false
    return editor.isActive('table')
  }, [activeEditorTab])

  const shouldShowTextEn = useCallback(({ editor, state, from, to }: any) => {
    if (activeEditorTab !== 'en') return false
    if (!isTextSelection(state.selection)) return false
    if (editor.isActive('table')) return false
    if (editor.isActive('codeBlock')) return false
    if (from === to) return false
    const selectedText = state.doc.textBetween(from, to, ' ', ' ').trim()
    return selectedText.length > 0
  }, [activeEditorTab])

  const shouldShowTableAr = useCallback(({ editor }: any) => {
    if (activeEditorTab !== 'ar') return false
    return editor.isActive('table')
  }, [activeEditorTab])

  const shouldShowTextAr = useCallback(({ editor, state, from, to }: any) => {
    if (activeEditorTab !== 'ar') return false
    if (!isTextSelection(state.selection)) return false
    if (editor.isActive('table')) return false
    if (editor.isActive('codeBlock')) return false
    if (from === to) return false
    const selectedText = state.doc.textBetween(from, to, ' ', ' ').trim()
    return selectedText.length > 0
  }, [activeEditorTab])
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsSnapshot, setSettingsSnapshot] = useState<any>(null)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const handleCoverFileChange = async (event: any) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsUploadingCover(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mediaType', file.type.startsWith('image/') ? 'image' : 'file')
      if (meta.wikiSlug) {
        formData.append('wikiSlug', meta.wikiSlug)
      }
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.url) {
        setMeta((prev: any) => ({ ...prev, coverImage: data.url }))
      }
    } catch (e) {
      console.error('Upload failed', e)
    } finally {
      setIsUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  const triggerCoverUpload = () => {
    coverInputRef.current?.click()
  }

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
        codeBlock: false,
        link: false,
        underline: false,
        blockquote: { HTMLAttributes: { class: 'border-l-4 border-gray-300 pl-3 py-2 bg-gray-50 rounded' } },
      }),
      Heading.configure({
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: ({ level }: { level: number }) => {
            switch (level) {
              case 1: return 'text-5xl font-extrabold mt-8 mb-4 text-gray-900 scroll-mt-36'
              case 2: return 'text-4xl font-bold mt-8 mb-4 text-gray-900 scroll-mt-36'
              case 3: return 'text-2xl font-semibold mt-8 mb-4 text-gray-900 scroll-mt-36'
              default: return 'text-xl font-semibold mt-8 mb-4 text-gray-900 scroll-mt-36'
            }
          },
          'data-toc': '',
        }
      }),
      Image,
      Youtube.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: '100%',
              renderHTML: (attributes: Record<string, any>) => ({
                width: attributes.width,
                style: `width: ${attributes.width}`,
              }),
            },
            align: {
              default: 'center',
              renderHTML: (attributes: Record<string, any>) => ({
                'data-align': attributes.align,
                style: `text-align: ${attributes.align}`,
              }),
            },
          }
        },
        addNodeView() {
          return ReactNodeViewRenderer(YoutubeComponent)
        },
      }).configure({ controls: true }),
      Link.configure({ openOnClick: true, autolink: true, linkOnPaste: true }),
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCellWithBackground,
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView)
        },
      }).configure({ lowlight: lowlightInstance }),
      Video,
      ImageSlider,
      Columns,
      Column,
      Placeholder.configure({ placeholder: "type '/' to add a new element" }),
      SlashCommand.configure({
        getUploadContext: () => ({ wikiSlug: metaRef.current?.wikiSlug }),
      }),
    ],
    content: initialContentRef.current,
    editorProps: {
      attributes: { class: 'tiptap prose prose-xl max-w-none focus:outline-none', lang: 'en' },
      handleDOMEvents: {
        mousedown: handleTableMouseDown,
        dragstart: handleTableDragStart,
      },
    },
  }, [])

  const [isVerified, setIsVerified] = useState(false)



  const editorAr = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        link: false,
        underline: false,
        blockquote: { HTMLAttributes: { class: 'border-l-4 border-gray-300 pl-3 py-2 bg-gray-50 rounded' } },
      }),
      Heading.configure({
        levels: [1, 2, 3],
        HTMLAttributes: {
          class: ({ level }: { level: number }) => {
            switch (level) {
              case 1: return 'text-5xl font-extrabold mt-8 mb-4 text-gray-900 scroll-mt-36'
              case 2: return 'text-4xl font-bold mt-8 mb-4 text-gray-900 scroll-mt-36'
              case 3: return 'text-2xl font-semibold mt-8 mb-4 text-gray-900 scroll-mt-36'
              default: return 'text-xl font-semibold mt-8 mb-4 text-gray-900 scroll-mt-36'
            }
          },
          'data-toc': '',
        }
      }),
      Image,
      Youtube.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: '100%',
              renderHTML: (attributes: Record<string, any>) => ({
                width: attributes.width,
                style: `width: ${attributes.width}`,
              }),
            },
            align: {
              default: 'center',
              renderHTML: (attributes: Record<string, any>) => ({
                'data-align': attributes.align,
                style: `text-align: ${attributes.align}`,
              }),
            },
          }
        },
        addNodeView() {
          return ReactNodeViewRenderer(YoutubeComponent)
        },
      }).configure({ controls: true }),
      Link.configure({ openOnClick: true, autolink: true, linkOnPaste: true }),
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCellWithBackground,
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView)
        },
      }).configure({ lowlight: lowlightInstance }),
      Video,
      ImageSlider,
      Columns,
      Column,
      Placeholder.configure({ placeholder: "اكتب '/' للإدراج" }),
      SlashCommand.configure({
        getUploadContext: () => ({ wikiSlug: metaRef.current?.wikiSlug }),
      }),
    ],
    content: initialContentRef.current,
    editorProps: {
      attributes: { class: 'tiptap tiptap-rtl prose prose-xl max-w-none focus:outline-none', lang: 'ar', dir: 'rtl' },
      handleDOMEvents: {
        mousedown: handleTableMouseDown,
        dragstart: handleTableDragStart,
      },
    },
  }, [])

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
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialLoadRef = useRef(!meta.isNew)
  const publishRef = useRef<any>(null)

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
                  width: item.width || '100%',
                  align: item.align || 'center',
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
                  width: item.width || '100%',
                  align: item.align || 'center',
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
    if (!developerId || !hasWikiAccess) return

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

        syncingArRef.current = true
        editorAr.commands.setContent(docAr, { emitUpdate: false })

        // Keep syncing flags TRUE for a short bit to catch any trailing events
        setTimeout(() => {
          syncingEnRef.current = false
          syncingArRef.current = false
        }, 500)

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
          const newCoverImage = typeof lesson?.coverImage === 'string' ? lesson.coverImage.trim() : ''
          if (newCoverImage !== prev.coverImage) {
            next.coverImage = newCoverImage
            changed = true
          }
          if (typeof lesson?.order === 'number' && lesson.order !== prev.order) {
            next.order = lesson.order
            changed = true
          }
          if (typeof lesson?.ownerId === 'string' && lesson.ownerId.trim() && lesson.ownerId !== prev.ownerId) {
            next.ownerId = lesson.ownerId.trim()
            changed = true
          }
          if (typeof lesson?.status === 'string' && lesson.status !== prev.status) {
            next.status = lesson.status
            changed = true
          }
          if (next.isNew) {
            next.isNew = false
            changed = true
          }
          return changed ? next : prev
        })
        // Mark load complete to enable autosave, but use a delay to allow stabilization
        setTimeout(() => {
          initialLoadRef.current = false
        }, 500)
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
  }, [editorEn, editorAr, meta.isNew, meta.slug, meta.id, meta.wikiSlug, developerId, hasWikiAccess])

  // --- Enforce Read-Only Mode on Document Lock ---
  useEffect(() => {
    if (editorEn) editorEn.setEditable(!isLockedByOther)
    if (editorAr) editorAr.setEditable(!isLockedByOther)
  }, [editorEn, editorAr, isLockedByOther])
  // -----------------------------------------------

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
    if (!editorEn && !editorAr) return;

    const handler = () => {
      setTocTrigger(prev => prev + 1);
    };

    editorEn?.on('update', handler);
    editorAr?.on('update', handler);

    return () => {
      editorEn?.off('update', handler);
      editorAr?.off('update', handler);
    };
  }, [editorEn, editorAr]);

  useEffect(() => {
    if (!editorAr) return
    const handler = () => {
      if (syncingArRef.current) return
      arabicDirtyRef.current = true
      forceArabicDirtyRender((prev) => !prev)
    }
    editorAr.on('update', handler)
    return () => { editorAr.off('update', handler) }
  }, [editorAr])





  useEffect(() => {
    const slug = typeof meta.slug === 'string' ? meta.slug.trim() : ''
    const id = typeof meta.id === 'string' ? meta.id.trim() : ''
    if (!slug && !id) return
    try { sessionStorage.setItem('lessonMeta', JSON.stringify(meta)) } catch { }
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
  const textColors = ['#111827', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
  const highlightColors = ['#fff59d', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff']

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

    const handleNodeInternal = (node: any): any => {
      if (!node || typeof node !== 'object') return null
      switch (node.type) {
        case 'paragraph': {
          const { text, html } = serializeInline(node.content)
          if (!text && !html) return null
          const block: any = {
            type: 'paragraph',
            [textKey]: (text || '').trim(),
            [jsonKey]: cloneNode(node),
          }
          if (html) block[htmlKey] = html
          return block
        }
        case 'blockquote': {
          const htmlParts: string[] = []
          const textParts: string[] = []
          if (Array.isArray(node.content)) {
            node.content.forEach((child: any) => {
              if (child?.type === 'paragraph') {
                const { text, html } = serializeInline(child.content)
                if (html) htmlParts.push(html)
                if (text) textParts.push(text)
              } else if (child?.type === 'codeBlock') {
                const { text } = serializeInline(child.content)
                const lang = child.attrs?.language || ''
                if (text) {
                  htmlParts.push('<pre><code' + (lang ? ' class="language-' + escapeHtml(lang) + '"' : '') + '>' + escapeHtml(text) + '</code></pre>')
                  textParts.push(text)
                }
              }
            })
          }
          const rawText = textParts.join('\n').trim()
          if (!rawText) return null
          const variant = deriveCalloutVariant(rawText)
          const normalized = stripVariantPrefix(rawText, variant)
          const block: any = {
            type: 'callout',
            variant,
            [textKey]: normalized,
            [jsonKey]: cloneNode(node),
          }
          if (htmlParts.length > 0) block[htmlKey] = htmlParts.join('<br />')
          return block
        }
        case 'heading': {
          const { text, html } = serializeInline(node.content)
          if (!text) return null
          const block: any = {
            type: 'heading',
            level: Number(node.attrs?.level) || 2,
            [textKey]: text.trim(),
            [jsonKey]: cloneNode(node),
          }
          if (html && html !== escapeHtml(text.trim())) block[htmlKey] = html
          return block
        }
        case 'horizontalRule': {
          return {
            type: 'horizontalRule',
            [jsonKey]: cloneNode(node),
          }
        }
        case 'bulletList':
        case 'orderedList': {
          const { htmlItems, textItems } = serializeListNode(node)
          if (htmlItems.length === 0 && textItems.length === 0) return null
          return {
            type: 'list',
            ordered: node.type === 'orderedList',
            [itemsKey]: htmlItems,
            [textKey]: textItems.join('\n'),
            [jsonKey]: cloneNode(node),
          }
        }
        case 'table': {
          const block: any = {
            type: 'table',
            [jsonKey]: cloneNode(node),
          }
          const html = serializeNodeToHTML(node, editorInstance)
          if (html) block[htmlKey] = html
          return block
        }
        case 'imageSlider': {
          const images = Array.isArray(node.attrs?.images) ? node.attrs.images.filter((item: any) => {
            if (typeof item === 'string') return item.trim().length > 0;
            if (item && typeof item === 'object') return typeof item.url === 'string' && item.url.trim().length > 0;
            return false;
          }) : []
          const title = typeof node.attrs?.title === 'string' ? node.attrs.title.trim() : ''
          const block: any = {
            type: 'imageSlider',
            images,
            [jsonKey]: cloneNode(node),
          }
          if (title) {
            block[titleKey] = title
            block[captionKey] = title
          }
          const html = serializeNodeToHTML(node, editorInstance)
          if (html) block[htmlKey] = html
          return block
        }
        case 'image': {
          const src = node.attrs?.src
          if (!src) return null
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
          return block
        }
        case 'youtube': {
          const url = node.attrs?.src
          if (!url) return null
          return {
            type: 'youtube',
            url,
            width: node.attrs?.width,
            align: node.attrs?.align,
            [jsonKey]: cloneNode(node),
          }
        }
        case 'video': {
          const url = node.attrs?.src
          if (!url) return null
          const provider = node.attrs?.provider || (typeof url === 'string' && url.includes('vimeo.com') ? 'vimeo' : undefined)
          const block: any = {
            type: 'video',
            url,
            poster: node.attrs?.poster || undefined,
            [titleKey]: node.attrs?.title ? String(node.attrs.title) : undefined,
            [captionKey]: node.attrs?.title ? String(node.attrs.title) : undefined,
            provider,
            width: node.attrs?.width,
            align: node.attrs?.align,
            [jsonKey]: cloneNode(node),
          }
          return block
        }
        case 'columns': {
          return {
            type: 'columns',
            count: Number(node.attrs?.count) || 2,
            [jsonKey]: cloneNode(node),
            content: Array.isArray(node.content)
              ? node.content.map((child: any) => handleNodeInternal(child)).filter(Boolean)
              : []
          }
        }
        case 'column': {
          return {
            type: 'column',
            [jsonKey]: cloneNode(node),
            content: Array.isArray(node.content)
              ? node.content.map((child: any) => handleNodeInternal(child)).filter(Boolean)
              : []
          }
        }
        case 'codeBlock': {
          const { text, html } = serializeInline(node.content)
          if (!text) return null
          const block: any = {
            type: 'code',
            language: node.attrs?.language || 'typescript',
            [textKey]: text,
            [jsonKey]: cloneNode(node),
          }
          if (html) block[htmlKey] = html
          return block
        }
        default: {
          return null
        }
      }
    }

    if (Array.isArray(doc?.content)) {
      doc.content.forEach((node: any) => {
        const block = handleNodeInternal(node)
        if (block) blocks.push(block)
      })
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
    const primaryBody = activeEditorTab === 'ar' ? bodyAr : bodyEn
    const secondaryBody = activeEditorTab === 'ar' ? bodyEn : bodyAr
    const mergedBody = [] as any[]
    for (let i = 0; i < primaryBody.length; i++) {
      mergedBody.push({ ...(secondaryBody[i] || {}), ...(primaryBody[i] || {}) })
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
      version: documentVersion,
    }
    try {
      if (!developerId) {
        setStatus('Please sign in as a content developer before saving.')
        return
      }

      const currentStatus = meta.status || 'draft'
      const desiredStatus = (statusOverride || currentStatus) === 'published' && isAdmin ? 'published' : 'draft'

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
        status: typeof savedLesson.status === 'string' ? savedLesson.status : desiredStatus,
      }

      setMeta(updatedMeta)

      // Update local documentVersion to match what the backend just saved
      if (typeof savedLesson.version === 'number') {
        setDocumentVersion(savedLesson.version)
      }
      try {
        sessionStorage.setItem('lessonMeta', JSON.stringify(updatedMeta))
      } catch { }

      const params = new URLSearchParams(searchParams?.toString() ?? '')
      params.set('slug', updatedMeta.slug)
      params.set('id', updatedMeta.id)
      if (updatedMeta.wikiSlug) {
        params.set('wiki', updatedMeta.wikiSlug)
      }
      params.delete('new')
      router.replace(`/editor/lesson?${params.toString()}`, { scroll: false })

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

  // Autosave Implementation
  useEffect(() => { publishRef.current = publish })

  const [wikiLessons, setWikiLessons] = useState<any[]>([])
  const lessonsWikiSlugRef = useRef<string | null>(null)

  useEffect(() => {
    const wiki = meta.wikiSlug
    if (!wiki || (lessonsWikiSlugRef.current === wiki && wikiLessons.length > 0)) return

    lessonsWikiSlugRef.current = wiki

    async function load() {
      try {
        const res = await fetch(`/api/lessons?wiki=${wiki}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) setWikiLessons(data)
        }
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [meta.wikiSlug])

  const handleLessonClick = useCallback((lesson: any) => {
    if (lesson.slug === meta.slug) return

    // CRITICAL: Block autosave immediately to prevent stale meta
    // (e.g. old cover image) from being saved to the new lesson
    initialLoadRef.current = true

    // Cancel any pending autosave timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    setAutosaveProgress(0)

    // Reset the loaded lesson key so the new lesson will load fresh
    loadedLessonKeyRef.current = null

    // Write CLEAN meta for the new lesson into sessionStorage.
    // This prevents the old lesson's coverImage/title from persisting
    // when the page re-mounts and reads sessionStorage.
    const cleanMeta = {
      id: lesson.id,
      slug: lesson.slug,
      wikiSlug: lesson.wikiSlug || meta.wikiSlug,
      title_en: lesson.title_en || '',
      title_ar: lesson.title_ar || '',
      coverImage: lesson.coverImage || '',
      order: lesson.order || 0,
      ownerId: lesson.ownerId || '',
      status: lesson.status || 'draft',
      isNew: false,
    }
    try {
      sessionStorage.setItem('lessonMeta', JSON.stringify(cleanMeta))
    } catch { }

    // Also update local meta state immediately so the UI reflects the switch
    setMeta((prev: typeof meta) => ({ ...prev, ...cleanMeta }))

    setStatus('Loading lesson...')

    const params = new URLSearchParams()
    if (lesson.wikiSlug) params.set('wiki', lesson.wikiSlug)
    params.set('id', lesson.id)
    params.set('slug', lesson.slug)

    router.push(`/editor/lesson?${params.toString()}`)
  }, [meta.slug, meta.wikiSlug, router])

  const handleDownloadJSON = useCallback(() => {
    if (!editorEn || !editorAr) return

    const docEn = editorEn.getJSON()
    const docAr = editorAr.getJSON()
    const bodyEn = extractBody(docEn, 'en', editorEn)
    const bodyAr = extractBody(docAr, 'ar', editorAr)

    const mergedBody = [] as any[]
    const maxLen = Math.max(bodyEn.length, bodyAr.length)
    for (let i = 0; i < maxLen; i++) {
      mergedBody.push({ ...(bodyEn[i] || {}), ...(bodyAr[i] || {}) })
    }

    const titleEn = meta.title_en || meta.title_ar || 'Untitled'
    const titleAr = meta.title_ar || meta.title_en || 'عنوان غير متوفر'

    const payload = {
      id: meta.id || slugify(titleEn),
      wikiSlug: meta.wikiSlug || 'export',
      order: Number(meta.order) || 0,
      slug: meta.slug || slugify(titleEn),
      title_en: titleEn,
      title_ar: titleAr,
      coverImage: meta.coverImage || '',
      duration_min: Number(meta.duration_min) || 30,
      difficulty: meta.difficulty || 'Beginner',
      prerequisites_en: [],
      prerequisites_ar: [],
      materials: [],
      body: mergedBody,
      version: documentVersion,
      ownerId: meta.ownerId || developerId || ''
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${payload.slug || 'lesson'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [editorEn, editorAr, meta, documentVersion, developerId])

  const handleImportJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !editorEn || !editorAr) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        if (!json.body || !Array.isArray(json.body)) {
          throw new Error('Invalid lesson JSON format')
        }

        // Hydrate Meta (Preserving Identity fields: title, slug, coverImage)
        setMeta((prev: typeof meta) => ({
          ...prev,
          duration_min: json.duration_min || prev.duration_min,
          difficulty: json.difficulty || prev.difficulty,
          // ownerId and other metadata are also preserved from the current session
        }))

        // Hydrate Editors
        const docEn = bodyToDocument(json.body, 'en')
        const docAr = bodyToDocument(json.body, 'ar')

        syncingEnRef.current = true
        editorEn.commands.setContent(docEn, { emitUpdate: false })
        syncingArRef.current = true
        editorAr.commands.setContent(docAr, { emitUpdate: false })

        setTimeout(() => {
          syncingEnRef.current = false
          syncingArRef.current = false
        }, 500)

        setStatus('Lesson imported successfully!')
      } catch (err: any) {
        console.error('Import error:', err)
        setStatus(`Import failed: ${err.message}`)
      }
    }
    reader.readAsText(file)
    // Reset input
    event.target.value = ''
  }, [editorEn, editorAr, meta])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const triggerAutosave = useCallback(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    if (initialLoadRef.current) return
    if (isLockedByOther) return

    const duration = 3000
    const start = Date.now()

    setAutosaveProgress(0)
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const p = Math.min(100, (elapsed / duration) * 100)
      setAutosaveProgress(p)
      if (p >= 100 && progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }, 50)

    autosaveTimerRef.current = setTimeout(() => {
      if (initialLoadRef.current) return
      if (isLockedByOther) return

      setStatus('Autosaving...')
      setAutosaveProgress(0)
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)

      if (publishRef.current) {
        publishRef.current('draft').catch(() => { })
      }
    }, duration)
  }, [isLockedByOther])

  // Attach autosave triggers (only on genuine user edits, not programmatic setContent)
  useEffect(() => {
    if (!editorEn) return
    const handler = () => {
      if (syncingEnRef.current) return  // Skip: this is a programmatic content load
      if (initialLoadRef.current) return
      triggerAutosave()
      setTocTrigger(prev => prev + 1)
    }
    editorEn.on('update', handler)
    return () => { editorEn.off('update', handler) }
  }, [editorEn, triggerAutosave])

  useEffect(() => {
    if (!editorAr) return
    const handler = () => {
      if (syncingArRef.current) return  // Skip: this is a programmatic content load
      if (initialLoadRef.current) return
      triggerAutosave()
      setTocTrigger(prev => prev + 1)
    }
    editorAr.on('update', handler)
    return () => { editorAr.off('update', handler) }
  }, [editorAr, triggerAutosave])

  // Cleanup autosave timer
  useEffect(() => () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
  }, [])

  if (isSigningIn) {
    return <DeveloperLogin onSignedIn={handleDeveloperSignedIn} />
  }

  // 1. Loading State (Session/Developer fetching)
  if (!developer && !meta.isNew) {
    return (
      <div className="revolutionary-editor-container bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
          <p className="text-slate-500 font-medium tracking-tight">Verifying access...</p>
        </div>
      </div>
    )
  }

  // 2. Access Denied State (Unauthorized user)
  // This early return ensures that the main editor UI is NEVER rendered for unauthorized users,
  // making it impossible to reveal content via "Inspect Element".
  if (!hasWikiAccess && !meta.isNew) {
    return (
      <div className="revolutionary-editor-container bg-slate-50 min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-10 max-w-lg w-full text-center shadow-2xl border border-slate-200"
        >
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
            <ShieldAlert size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Access Denied</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            You don't have permission to manage lessons in the <span className="font-bold text-slate-900">"{meta.wikiSlug || 'this'}"</span> wiki.
            Please contact an administrator to request access.
          </p>
          <button
            onClick={() => router.push(`/editor/dashboard/${developer?.wikiSlugs?.[0] || 'student-kit'}`)}
            className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            Return to Dashboard
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="revolutionary-editor-container bg-transparent min-h-screen">
      {/* Document Warning Banners (Lock & Version Conflicts) */}
      <AnimatePresence>
        {(isLockedByOther && hasWikiAccess) && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-rose-500 text-white px-6 py-2.5 text-sm font-semibold flex items-center justify-center gap-3 shadow-md"
          >
            <AlertTriangle size={18} />
            <span className="flex-1 text-center">
              Hold up! {lockedBy ? `Developer "${lockedBy}"` : "Another developer"} is currently editing this lesson. Your changes cannot be saved to prevent overwriting their work.
            </span>
            {isAdmin && (
              <button
                onClick={handleTakeover}
                className="bg-white text-rose-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-rose-50 transition-colors shadow-sm"
              >
                Takeover
              </button>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Revert to Draft Confirmation Modal */}
      <AnimatePresence>
        {showDraftConfirmation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6 text-amber-500">
                <Unlock size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Edit Published Lesson?</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Editing this lesson will change its status back to <span className="font-bold text-amber-600">Draft</span>.
                You will need to <span className="font-bold">Publish</span> it again to make your changes visible to users.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDraftConfirmation(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmEditPublished}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all"
                >
                  Start Editing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Premium Header/Navbar area */}
      <div className={`fixed left-0 right-0 z-[60] bg-white border-b border-slate-200 px-6 py-3 shadow-sm transition-all duration-300 ${isLockedByOther ? 'top-10' : 'top-0'
        }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <NextLink
              href={`/editor/dashboard/${meta.wikiSlug || 'student-kit'}`}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 flex-shrink-0"
              title="Back to wiki"
            >
              <ArrowLeft size={20} />
            </NextLink>
            <div className="h-6 w-px bg-slate-200 flex-shrink-0" />
            <div className="flex-1 min-w-0 max-w-xl">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5 whitespace-nowrap overflow-hidden">
                <Globe size={10} />
                <span>{meta.wikiSlug || 'Wiki'}</span>
                <span>/</span>
                <span>Classic</span>
                <span className="h-3 w-px bg-slate-200 mx-1" />
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${meta.status === 'published'
                  ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                  : 'bg-amber-100 text-amber-600 border border-amber-200'
                  }`}>
                  {meta.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
              {activeEditorTab === 'en' ? (
                <input
                  type="text"
                  disabled={isLockedByOther}
                  value={meta.title_en || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setMeta((m: typeof meta) => {
                      const next = { ...m, title_en: val }
                      try { sessionStorage.setItem('lessonMeta', JSON.stringify(next)) } catch { }
                      return next
                    })
                  }}
                  placeholder="Untitled English Lesson"
                  className="text-lg font-bold text-slate-900 leading-none bg-transparent border-none outline-none w-full placeholder:text-slate-300 hover:bg-white/50 focus:bg-white/80 rounded px-1 -mx-1 py-0.5 transition-colors"
                />
              ) : (
                <input
                  type="text"
                  disabled={isLockedByOther}
                  value={meta.title_ar || ''}
                  dir="rtl"
                  onChange={(e) => {
                    const val = e.target.value
                    setMeta((m: typeof meta) => {
                      const next = { ...m, title_ar: val }
                      try { sessionStorage.setItem('lessonMeta', JSON.stringify(next)) } catch { }
                      return next
                    })
                  }}
                  placeholder="عنوان الدرس (Arabic Title)"
                  className="text-lg font-bold text-slate-900 leading-none bg-transparent border-none outline-none w-full placeholder:text-slate-300 hover:bg-white/50 focus:bg-white/80 rounded px-1 -mx-1 py-0.5 transition-colors text-right"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Import JSON"
              type="button"
            >
              <Upload size={18} />
            </button>

            <button
              onClick={handleDownloadJSON}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border-l border-slate-200 ml-1 pl-3"
              title="Download JSON"
              type="button"
            >
              <Download size={18} />
            </button>
            {ENABLE_SEGMENTS_EDITOR && (
              <NextLink
                href={`/editor/segment?wiki=${meta.wikiSlug}&id=${meta.id}&title=${encodeURIComponent(meta.title_en || '')}`}
                className="text-xs font-bold text-[#f05d4e] hover:text-[#f05d4e]/80 transition-colors mr-2 hidden xl:block"
              >
                Switch to Segment Editor →
              </NextLink>
            )}

            <div className="hidden md:flex flex-col items-end mr-4">
              {/* Last Saved Status */}
              {status.includes('Saving') || status.includes('Autosaving') ? (
                <div className="text-[10px] text-slate-400 font-medium italic animate-pulse">Saving...</div>
              ) : autosaveProgress > 0 && autosaveProgress < 100 ? (
                <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                  Syncing in {Math.ceil((3000 - (autosaveProgress * 3000 / 100)) / 1000)}s...
                </div>
              ) : status && (status.toLowerCase().includes('error') || status.toLowerCase().includes('only owner') || status.toLowerCase().includes('sign in')) ? (
                <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={status}>
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {status.replace('Error: ', '')}
                </div>
              ) : status && status === 'Autosaving...' ? (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Autosaving...
                </div>
              ) : status && (status.includes('saved') || status.includes('published') || status === 'Synced') ? (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Synced
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 font-medium italic">Not saved yet</div>
              )}
              {meta.slug && <p className="text-[10px] text-slate-300 font-mono leading-none mt-0.5">{meta.slug}</p>}
            </div>

            <button
              onClick={() => {
                setSettingsSnapshot({
                  title_en: meta.title_en,
                  title_ar: meta.title_ar,
                  slug: meta.slug,
                  coverImage: meta.coverImage
                })
                setShowSettingsModal(true)
              }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Lesson Settings"
              type="button"
            >
              <Settings size={18} />
            </button>

            {meta.slug && (
              <button
                onClick={async () => {
                  setStatus('Preparing preview...')
                  await publish('draft')
                  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                  const kitSlug = meta.wikiSlug || 'student-kit'
                  const url = (!isLocal && typeof window !== 'undefined')
                    ? `https://${HUB_DOMAIN}/${kitSlug}/en/${meta.slug}?preview=1`
                    : `/en/${kitSlug}/lesson/${meta.slug}?preview=1`
                  window.open(url, '_blank')
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                type="button"
              >
                <Eye size={14} />
                <span className="hidden sm:inline">Preview</span>
              </button>
            )}

            <div className="relative inline-flex items-center">
              <AnimatePresence>
                {autosaveProgress > 0 && autosaveProgress < 100 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute -inset-[3px] pointer-events-none z-10"
                  >
                    <svg className="w-full h-full overflow-visible">
                      <motion.rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        rx="10"
                        fill="none"
                        stroke="#f05d4e"
                        strokeWidth="2"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray="100 100"
                        initial={{ strokeDashoffset: 100 }}
                        animate={{ strokeDashoffset: 100 - autosaveProgress }}
                        transition={{ ease: "linear", duration: 0.1 }}
                      />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => {
                  if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
                  if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                  setAutosaveProgress(0);
                  publish();
                }}
                disabled={saveDisabled}
                className="relative z-0 flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                style={{ borderRadius: '8px' }}
                title={saveDisabled ? 'Only owner/admin can save' : 'Save'}
                type="button"
              >
                <Save size={14} className={autosaveProgress > 0 ? 'animate-bounce' : ''} />
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-[#f05d4e] hover:bg-[#f05d4e]/90 rounded-lg transition-colors shadow-sm"
                type="button"
              >
                <Rocket size={14} />
                <span className="hidden sm:inline">Publish</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Match KitLayout's outer container */}
      <div className="mx-auto w-full max-w-[1920px] px-6 sm:px-10 lg:px-16 pt-20 pb-12">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 xl:px-12 pt-4 pb-10">
          <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
            <div className="hidden lg:block relative">
              <Sidebar
                locale={activeEditorTab === 'ar' ? 'ar' : 'en'}
                kitSlug={meta.wikiSlug || 'student-kit'}
                isOpen={true}
                onClose={() => { }}
                lessons={wikiLessons}
                className="!static !w-full !h-auto !shadow-none lg:!sticky lg:!top-24"
                onLessonClick={handleLessonClick}
                activeSlug={meta.slug}
                hideLessons={true}
                tocMaxLevel={1}
                refreshTocTrigger={tocTrigger}
              />
            </div>
            <div className="flex-1 space-y-6">


              {/* Language Tab Switcher */}
              <div className="editor-tab-bar">
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('en')}
                  className={`editor-tab-btn ${activeEditorTab === 'en' ? 'active !border-[#f05d4e] !text-[#f05d4e]' : ''}`}
                >
                  <span className="glass-lang-indicator en">EN</span>
                  <span>English</span>
                  <span className="editor-tab-direction">LTR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('ar')}
                  className={`editor-tab-btn ${activeEditorTab === 'ar' ? 'active !border-[#f05d4e] !text-[#f05d4e]' : ''}`}
                >
                  <span className="glass-lang-indicator ar">AR</span>
                  <span>العربية</span>
                  <span className="editor-tab-direction">RTL</span>
                  {!isVerified && <span className="editor-tab-lock">🔒</span>}
                </button>
              </div>

              <div className="revolutionary-editor-single relative">
                {/* Overlay to intercept edits on published lessons */}
                {meta.status === 'published' && (
                  <div className="absolute inset-0 z-50 bg-white/40 backdrop-blur-[2px] rounded-3xl flex items-center justify-center">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/90 p-8 rounded-3xl shadow-xl border border-slate-200 text-center max-w-sm mx-4"
                    >
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Lesson is Published</h3>
                      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        This lesson is currently live. You can view the content, but editing requires reverting it to Draft status.
                      </p>
                      <button
                        onClick={() => setShowDraftConfirmation(true)}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-md hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                        <Unlock size={16} />
                        Unlock for Editing
                      </button>
                    </motion.div>
                  </div>
                )}
                {/* English Editor Pane */}
                <div className="glass-editor-panel" style={{ display: activeEditorTab === 'en' ? 'block' : 'none' }}>
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



                  <div className="glass-editor-content p-5 md:p-8 xl:p-10 space-y-6" data-editor-lang="en">

                    {/* Table Bubble Menu */}
                    {editorEn && (
                      <BubbleMenu
                        editor={editorEn}
                        pluginKey="table-bubble-en"
                        shouldShow={shouldShowTableEn}
                        options={bubbleMenuOptions}
                      >
                        <div className="glass-bubble-menu" onMouseDown={(e) => e.preventDefault()}>
                          <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().addRowBefore().run()} title="Add row above"><ArrowUpToLine className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().addRowAfter().run()} title="Add row below"><ArrowDownToLine className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().addColumnBefore().run()} title="Add column left"><ArrowLeftToLine className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().addColumnAfter().run()} title="Add column right"><ArrowRightToLine className="w-3.5 h-3.5" /></button>
                          <span className="glass-bubble-divider" />
                          <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().deleteRow().run()} title="Delete row" style={{ color: '#ef4444' }}><MinusCircle className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().deleteColumn().run()} title="Delete column" style={{ color: '#ef4444' }}><MinusCircle className="w-3.5 h-3.5 rotate-90" /></button>
                          <span className="glass-bubble-divider" />
                          <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().toggleHeaderRow().run()} title="Toggle header row"><HeadingIcon className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().mergeCells().run()} title="Merge cells"><Merge className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().splitCell().run()} title="Split cell"><Split className="w-3.5 h-3.5" /></button>
                          <span className="glass-bubble-divider" />
                          {tableColors.map(c => (
                            <button key={c.name} className="glass-bubble-color" style={{ background: c.value || '#f8fafc' }} onClick={() => editorEn?.chain().focus().setCellAttribute('backgroundColor', c.value || null).run()} title={c.name} />
                          ))}
                          <span className="glass-bubble-divider" />
                          <button className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().deleteTable().run()} title="Delete table" style={{ color: '#dc2626' }}><Trash2 className="inline w-3.5 h-3.5" /></button>
                        </div>
                      </BubbleMenu>
                    )}

                    {/* Text Bubble Menu */}
                    {editorEn && (
                      <BubbleMenu
                        editor={editorEn}
                        pluginKey="text-bubble-en"
                        shouldShow={shouldShowTextEn}
                        options={bubbleMenuOptions}
                      >
                        <div className="glass-bubble-menu" onMouseDown={(e) => e.preventDefault()}>
                          <button type="button" className="glass-bubble-btn" style={{ fontWeight: 700 }} onClick={() => editorEn?.chain().focus().toggleBold().run()} title="Bold">B</button>
                          <button type="button" className="glass-bubble-btn" style={{ fontStyle: 'italic' }} onClick={() => editorEn?.chain().focus().toggleItalic().run()} title="Italic">I</button>
                          <button type="button" className="glass-bubble-btn" style={{ textDecoration: 'underline' }} onClick={() => editorEn?.chain().focus().toggleUnderline().run()} title="Underline">U</button>
                          <button type="button" className="glass-bubble-btn" style={{ textDecoration: 'line-through' }} onClick={() => editorEn?.chain().focus().toggleStrike().run()} title="Strikethrough">S</button>
                          <span className="glass-bubble-divider" />
                          <button type="button" className="glass-bubble-btn" onClick={() => promptForLink(editorEn)} title="Add link"><Link2 className="inline w-3.5 h-3.5" /></button>
                          <button type="button" className="glass-bubble-btn" onClick={() => editorEn?.chain().focus().unsetLink().run()} title="Remove link"><Unlock className="inline w-3.5 h-3.5" /></button>
                          <span className="glass-bubble-divider" />
                          {textColors.map(col => (
                            <button type="button" key={col} className="glass-bubble-color" style={{ background: col }} onClick={() => { if (!editorEn || !supportsColorEn) return; editorEn.chain().focus().setColor(col).run() }} title="Text color" />
                          ))}
                          <button type="button" className="glass-bubble-btn text-xs" onClick={() => supportsColorEn ? editorEn?.chain().focus().unsetColor().run() : undefined} title="Clear color"><X className="inline w-3 h-3" /></button>
                          <span className="glass-bubble-divider" />
                          {highlightColors.map(col => (
                            <button type="button" key={col} className="glass-bubble-color" style={{ background: col }} onClick={() => { if (!editorEn) return; editorEn.chain().focus().toggleHighlight({ color: col }).run() }} title="Highlight" />
                          ))}
                          <button type="button" className="glass-bubble-btn text-xs" onClick={() => editorEn?.chain().focus().unsetHighlight().run()} title="Clear highlight"><X className="inline w-3 h-3" /></button>
                        </div>
                      </BubbleMenu>
                    )}

                    <EditorContent editor={editorEn} />
                  </div>
                </div>

                {/* Arabic Editor Pane */}
                <div className={`glass-editor-panel ${!isVerified ? 'glass-editor-locked' : ''}`} style={{ display: activeEditorTab === 'ar' ? 'block' : 'none' }}>
                  <div className="glass-editor-header">
                    <div className="glass-editor-header-title">
                      <span className="glass-lang-indicator ar">AR</span>
                      <span>العربية</span>
                      <span className="text-slate-400 text-xs font-normal">• Right to Left</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {isVerified && (
                        <span className="glass-editor-header-badge synced"><Check className="inline w-3.5 h-3.5 mr-0.5" /> Synced</span>
                      )}
                      <button
                        onClick={() => setShowVerifyModal(true)}
                        className="glass-verify-btn"
                        title={isVerified ? "Overwrite Arabic with current English content" : "Verify English and unlock Arabic"}
                      >
                        <Unlock className="inline w-4 h-4 mr-1" /> {isVerified ? 'Re-Mirror English' : 'Verify & Mirror'}
                      </button>
                    </div>
                  </div>



                  <div className="glass-editor-content p-5 md:p-8 xl:p-10 space-y-6" data-editor-lang="ar">
                    {arabicDirtyRef.current && (
                      <div className="glass-sync-ribbon needs-sync">
                        <AlertTriangle className="inline w-3.5 h-3.5 mr-1" /> Arabic content has diverged from English
                      </div>
                    )}
                    {/* Table Bubble Menu AR */}
                    {editorAr && (
                      <BubbleMenu
                        editor={editorAr}
                        pluginKey="table-bubble-ar"
                        shouldShow={shouldShowTableAr}
                        options={bubbleMenuOptions}
                      >
                        <div className="glass-bubble-menu" onMouseDown={(e) => e.preventDefault()}>
                          <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().addRowBefore().run()} title="إضافة صف للأعلى"><ArrowUpToLine className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().addRowAfter().run()} title="إضافة صف للأسفل"><ArrowDownToLine className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().addColumnBefore().run()} title="إضافة عمود لليسار"><ArrowLeftToLine className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().addColumnAfter().run()} title="إضافة عمود لليمين"><ArrowRightToLine className="w-3.5 h-3.5" /></button>
                          <span className="glass-bubble-divider" />
                          <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().deleteRow().run()} title="حذف صف" style={{ color: '#ef4444' }}><MinusCircle className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().deleteColumn().run()} title="حذف عمود" style={{ color: '#ef4444' }}><MinusCircle className="w-3.5 h-3.5 rotate-90" /></button>
                          <span className="glass-bubble-divider" />
                          <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().toggleHeaderRow().run()} title="تبديل صف الرأس"><HeadingIcon className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().mergeCells().run()} title="دمج الخلايا"><Merge className="w-3.5 h-3.5" /></button>
                          <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().splitCell().run()} title="تقسيم الخلية"><Split className="w-3.5 h-3.5" /></button>
                          <span className="glass-bubble-divider" />
                          {tableColors.map(c => (
                            <button key={c.name} className="glass-bubble-color" style={{ background: c.value || '#f8fafc' }} onClick={() => editorAr?.chain().focus().setCellAttribute('backgroundColor', c.value || null).run()} title={c.name} />
                          ))}
                          <span className="glass-bubble-divider" />
                          <button className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().deleteTable().run()} title="Delete table" style={{ color: '#dc2626' }}><Trash2 className="inline w-3.5 h-3.5" /></button>
                        </div>
                      </BubbleMenu>
                    )}

                    {/* Text Bubble Menu AR */}
                    {editorAr && (
                      <BubbleMenu
                        editor={editorAr}
                        pluginKey="text-bubble-ar"
                        shouldShow={shouldShowTextAr}
                        options={bubbleMenuOptions}
                      >
                        <div className="glass-bubble-menu" onMouseDown={(e) => e.preventDefault()}>
                          <button type="button" className="glass-bubble-btn" style={{ fontWeight: 700 }} onClick={() => editorAr?.chain().focus().toggleBold().run()} title="Bold">B</button>
                          <button type="button" className="glass-bubble-btn" style={{ fontStyle: 'italic' }} onClick={() => editorAr?.chain().focus().toggleItalic().run()} title="Italic">I</button>
                          <button type="button" className="glass-bubble-btn" style={{ textDecoration: 'underline' }} onClick={() => editorAr?.chain().focus().toggleUnderline().run()} title="Underline">U</button>
                          <button type="button" className="glass-bubble-btn" style={{ textDecoration: 'line-through' }} onClick={() => editorAr?.chain().focus().toggleStrike().run()} title="Strikethrough">S</button>
                          <span className="glass-bubble-divider" />
                          <button type="button" className="glass-bubble-btn" onClick={() => promptForLink(editorAr)} title="Add link"><Link2 className="inline w-3.5 h-3.5" /></button>
                          <button type="button" className="glass-bubble-btn" onClick={() => editorAr?.chain().focus().unsetLink().run()} title="Remove link"><Unlock className="inline w-3.5 h-3.5" /></button>
                          <span className="glass-bubble-divider" />
                          {textColors.map(col => (
                            <button type="button" key={col} className="glass-bubble-color" style={{ background: col }} onClick={() => { if (!editorAr || !supportsColorAr) return; editorAr.chain().focus().setColor(col).run() }} title="Text color" />
                          ))}
                          <button type="button" className="glass-bubble-btn text-xs" onClick={() => supportsColorAr ? editorAr?.chain().focus().unsetColor().run() : undefined} title="Clear color"><X className="inline w-3 h-3" /></button>
                          <span className="glass-bubble-divider" />
                          {highlightColors.map(col => (
                            <button type="button" key={col} className="glass-bubble-color" style={{ background: col }} onClick={() => { if (!editorAr) return; editorAr.chain().focus().toggleHighlight({ color: col }).run() }} title="Highlight" />
                          ))}
                          <button type="button" className="glass-bubble-btn text-xs" onClick={() => editorAr?.chain().focus().unsetHighlight().run()} title="Clear highlight"><X className="inline w-3 h-3" /></button>
                        </div>
                      </BubbleMenu>
                    )}

                    <EditorContent editor={editorAr} />
                  </div>
                </div>
              </div>
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
                  <div className="p-2 bg-[#f05d4e]/10 rounded-lg">
                    <Unlock className="w-5 h-5 text-[#f05d4e]" />
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
                      className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${isChecked ? 'border-blue-200 bg-[#f05d4e]/5/50' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
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
                  className="group relative px-8 py-2.5 bg-[#f05d4e] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#f05d4e]/30 hover:bg-[#f05d4e]/90 disabled:opacity-50 disabled:shadow-none disabled:bg-slate-300 transition-all active:scale-95 overflow-hidden"
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
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
            >
              <div className="bg-slate-50 px-8 py-6 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-[#f05d4e]/10 rounded-lg">
                    <Settings className="w-5 h-5 text-[#f05d4e]" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Lesson Settings</h3>
                </div>
                <p className="text-sm text-slate-500">Configure metadata for this lesson.</p>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Lesson Title (English)
                  </label>
                  <input
                    type="text"
                    value={meta.title_en || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setMeta((m: typeof meta) => {
                        const next = { ...m, title_en: val }
                        try { sessionStorage.setItem('lessonMeta', JSON.stringify(next)) } catch { }
                        return next
                      })
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f05d4e] focus:border-transparent transition-all"
                    placeholder="Enter lesson title..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <span className="text-sm font-semibold text-slate-700" dir="ltr">(Arabic Title)</span>
                    <label className="text-sm font-semibold text-slate-700" dir="rtl">عنوان الدرس</label>
                  </div>
                  <input
                    type="text"
                    value={meta.title_ar || ''}
                    dir="rtl"
                    onChange={(e) => {
                      const val = e.target.value
                      setMeta((m: typeof meta) => {
                        const next = { ...m, title_ar: val }
                        try { sessionStorage.setItem('lessonMeta', JSON.stringify(next)) } catch { }
                        return next
                      })
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#f05d4e] focus:border-transparent transition-all text-right"
                    placeholder="عنوان الدرس..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={meta.slug || (meta.title_en || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')}
                    onChange={(e) => {
                      const val = e.target.value
                      setMeta((m: typeof meta) => {
                        const next = { ...m, slug: val }
                        try { sessionStorage.setItem('lessonMeta', JSON.stringify(next)) } catch { }
                        return next
                      })
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#f05d4e] focus:border-transparent transition-all"
                    placeholder="lesson-slug"
                  />
                  <p className="text-xs text-slate-400 mt-1">This will be used in the lesson URL.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-4">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={16} /> Cover Image
                    </div>
                  </label>

                  {!meta.coverImage ? (
                    <div
                      onClick={triggerCoverUpload}
                      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isUploadingCover ? 'border-[#f05d4e]/40 bg-[#f05d4e]/5' : 'border-slate-300 hover:bg-slate-50 hover:border-slate-400'}`}
                    >
                      <input
                        type="file"
                        ref={coverInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleCoverFileChange}
                      />
                      <div className="bg-[#f05d4e]/10 text-[#f05d4e] p-3 rounded-full mb-3">
                        {isUploadingCover ? <Loader2 className="animate-spin w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                      </div>
                      <p className="font-semibold text-slate-700">
                        {isUploadingCover ? 'Uploading...' : 'Click to upload cover image'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">SVG, PNG, JPG (max. 5MB)</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video relative group">
                        <img
                          key={meta.coverImage}
                          src={meta.coverImage}
                          alt="Cover Preview"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={triggerCoverUpload}
                            className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold shadow-lg hover:bg-slate-100 transition-colors"
                          >
                            Change Image
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setMeta((prev: any) => ({ ...prev, coverImage: '' }))
                          }}
                          className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Remove Image
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={coverInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleCoverFileChange}
                      />
                    </div>
                  )}
                </div>

              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    if (settingsSnapshot) {
                      setMeta((prev: typeof meta) => {
                        const next = { ...prev, ...settingsSnapshot }
                        try { sessionStorage.setItem('lessonMeta', JSON.stringify(next)) } catch { }
                        return next
                      })
                    }
                    setShowSettingsModal(false)
                  }}
                  className="px-6 py-2.5 text-slate-600 hover:text-slate-900 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowSettingsModal(false)
                    publish('draft')
                  }}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200/50 hover:bg-slate-800 transition-all active:scale-95"
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}








