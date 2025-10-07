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
import Video from './extensions/Video'
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
      isNew: false,
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
          type: 'paragraph',
        },
      ],
    }
  }

  const editorEn = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
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
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCellWithBackground,
      CodeBlockLowlight.configure({ lowlight: lowlightInstance }),
      Video,
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
      SlashCommand,
    ],
    content: initialContentRef.current,
    editorProps: {
      attributes: { class: 'max-w-none focus:outline-none', lang: 'en' },
    },
  }, [bubbleElementEn, textBubbleElementEn])

  const editorAr = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
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
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCellWithBackground,
      CodeBlockLowlight.configure({ lowlight: lowlightInstance }),
      Video,
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
                content: listItems.map((entry: string) => ({
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: stripHtml(entry) ? [{ type: 'text', text: stripHtml(entry) }] : [],
                    },
                  ],
                })),
              })
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
              nodes.push({
                type: 'video',
                attrs: {
                  src: item.url,
                  poster: item.poster || null,
                  title: item[titleKey] || item[captionKey] || null,
                  controls: true,
                },
              })
            }
            break
          default:
            if (textValue) {
              nodes.push({
                type: 'paragraph',
                content: [{ type: 'text', text: textValue }],
              })
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

    const identifier = (meta.slug || meta.id || '').trim()
    if (!identifier) return
    const wikiSlug = (meta.wikiSlug || 'student-kit').trim() || 'student-kit'
    const cacheKey = `${wikiSlug}::${identifier}`
    if (loadedLessonKeyRef.current === cacheKey) return

    let cancelled = false

    const loadLesson = async () => {
      try {
        const res = await fetch(`/api/lessons/${encodeURIComponent(identifier)}?kit=${encodeURIComponent(wikiSlug)}`, { cache: 'no-store' })
        if (!res.ok) {
          console.error('Failed to load lesson content', res.status)
          setStatus('Failed to load lesson content.')
          return
        }
        const lesson = await res.json()
        if (cancelled) return

        loadedLessonKeyRef.current = cacheKey

        const body = Array.isArray(lesson?.body) ? lesson.body : []
        const docEn = bodyToDocument(body, 'en')
        const docAr = bodyToDocument(body, 'ar')

        syncingEnRef.current = true
        editorEn.commands.setContent(docEn, { emitUpdate: false })
        setTimeout(() => { syncingEnRef.current = false }, 0)

        syncingArRef.current = true
        editorAr.commands.setContent(docAr, { emitUpdate: false })
        setTimeout(() => { syncingArRef.current = false }, 0)

        arabicDirtyRef.current = false
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
          if (typeof lesson?.order === 'number' && lesson.order !== prev.order) {
            next.order = lesson.order
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
  }, [editorEn, editorAr, meta.isNew, meta.slug, meta.id, meta.wikiSlug])

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
        case 'image': {
          const src = node.attrs?.src
          if (!src) break
          const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt.trim() : ''
          const title = typeof node.attrs?.title === 'string' ? node.attrs.title.trim() : ''
          const block: any = {
            type: 'image',
            image: src,
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
          const block: any = {
            type: 'video',
            url,
            poster: node.attrs?.poster || undefined,
            [titleKey]: node.attrs?.title ? String(node.attrs.title) : undefined,
            [jsonKey]: cloneNode(node),
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
      duration_min: Number(meta.duration_min) || 30,
      difficulty: meta.difficulty,
      prerequisites_en: [],
      prerequisites_ar: [],
      materials: [],
      body: mergedBody,
      forceNew: meta.isNew === true,
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

      const savedLesson = data?.lesson ?? {}
      const isUpdate = Boolean(data?.isUpdate)

      const updatedMeta = {
        ...meta,
        id: typeof savedLesson.id === 'string' && savedLesson.id.trim() ? savedLesson.id : generatedId,
        slug: typeof savedLesson.slug === 'string' && savedLesson.slug.trim() ? savedLesson.slug : generatedSlug,
        order: typeof savedLesson.order === 'number' ? savedLesson.order : meta.order,
        isNew: false,
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
        setStatus(`Lesson published! Saved as "${updatedMeta.slug}".`)
      } else {
        setStatus(isUpdate ? 'Changes saved!' : 'Lesson published!')
      }
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
            <button className="px-3 py-1.5 rounded-md bg-green-600 text-white text-sm hover:opacity-90" onClick={publish}>Publish to Wiki</button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* English Editor Pane */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="px-6 pt-6 pb-4 border-b text-sm text-gray-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>English (left to right)</span>
                </div>
                <span className="text-xs text-gray-400">Press <span className="px-1 rounded bg-gray-100">/</span> for commands</span>
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
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="px-6 pt-6 pb-4 border-b text-sm text-gray-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Arabic (right to left)</span>
                </div>
                <span className="text-xs text-gray-400">يمكنك استخدام الأمر <span className="px-1 rounded bg-gray-100">/</span> للإدراج</span>
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








