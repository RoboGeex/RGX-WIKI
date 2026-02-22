import { Extension, type Editor } from '@tiptap/core'
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion'

export type SlashItem = {
  title: string
  description?: string
  shortcut?: string
  keywords?: string[]
  icon?: string
  category?: 'text' | 'media' | 'structure' | 'code'
  command: (props: any) => void
}

export type UploadContext = {
  wikiSlug?: string
}

const getUploadContext = (editor: Editor): UploadContext => {
  const storage = (editor as any)?.storage?.['slash-command'] as
    | { getUploadContext?: () => UploadContext }
    | undefined
  const getter = storage && typeof storage.getUploadContext === 'function'
    ? storage.getUploadContext
    : undefined
  return getter ? getter() ?? {} : {}
}

const insertListWithFallback = (editor: Editor, range: { from: number; to: number }, listType: 'bulletList' | 'orderedList') => {
  const toggleSucceeded = listType === 'orderedList'
    ? editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    : editor.chain().focus().deleteRange(range).toggleBulletList().run()

  if (toggleSucceeded) {
    return true
  }

  const listNode = {
    type: listType,
    content: [
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '' }],
          },
        ],
      },
    ],
  }

  const inserted = editor.chain().focus().deleteRange(range).insertContent(listNode).run()
  if (!inserted) {
    return false
  }

  const targetPos = Math.max(0, Math.min(editor.state.doc.content.size, range.from + 2))
  editor.commands.setTextSelection(targetPos)
  return true
}

const items: SlashItem[] = [
  // TEXT FORMATTING
  {
    title: 'Heading 1',
    description: 'Large section heading',
    shortcut: '#',
    icon: 'H1',
    category: 'text',
    keywords: ['h1', 'title', 'large'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    shortcut: '##',
    icon: 'H2',
    category: 'text',
    keywords: ['h2', 'subtitle'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    shortcut: '###',
    icon: 'H3',
    category: 'text',
    keywords: ['h3', 'small'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Create an unordered list',
    shortcut: '•',
    icon: '•',
    category: 'text',
    keywords: ['list', 'ul', 'unordered'],
    command: ({ editor, range }: any) => insertListWithFallback(editor, range, 'bulletList'),
  },
  {
    title: 'Numbered List',
    description: 'Create an ordered list',
    shortcut: '1.',
    icon: '1.',
    category: 'text',
    keywords: ['list', 'ol', 'ordered', 'number'],
    command: ({ editor, range }: any) => insertListWithFallback(editor, range, 'orderedList'),
  },
  {
    title: 'Callout',
    description: 'Add a highlighted note or tip',
    shortcut: 'Tip',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
    category: 'text',
    keywords: ['note', 'info', 'callout', 'warning', 'tip'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  
  // CODE
  {
    title: 'Code Block',
    description: 'Add syntax-highlighted code',
    shortcut: '```',
    icon: '</>',
    category: 'code',
    keywords: ['code', 'pre', 'syntax', 'programming', 'javascript', 'python'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setCodeBlock().run(),
  },
  
  // STRUCTURE
  {
    title: 'Separator',
    description: 'Add a horizontal divider',
    shortcut: '---',
    icon: '—',
    category: 'structure',
    keywords: ['divider', 'line', 'rule', 'hr'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: 'Table',
    description: 'Insert a 3x3 table',
    shortcut: 'tbl',
    icon: '⊞',
    category: 'structure',
    keywords: ['grid', 'table', 'rows', 'columns'],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
  },
  {
    title: '2 Columns',
    description: 'Side-by-side columns (50/50)',
    shortcut: 'cols',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="12" x2="12" y1="3" y2="21"/></svg>',
    category: 'structure',
    keywords: ['columns', 'layout', 'grid', 'split', 'side'],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: 'columns',
        attrs: { count: 2 },
        content: [
          { type: 'column', content: [{ type: 'paragraph' }] },
          { type: 'column', content: [{ type: 'paragraph' }] },
        ]
      }).run()
    },
  },
  {
    title: '3 Columns',
    description: 'Three side-by-side columns',
    shortcut: 'cols3',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" x2="9" y1="3" y2="21"/><line x1="15" x2="15" y1="3" y2="21"/></svg>',
    category: 'structure',
    keywords: ['columns', 'layout', 'grid', 'split', 'side'],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).insertContent({
        type: 'columns',
        attrs: { count: 3 },
        content: [
          { type: 'column', content: [{ type: 'paragraph' }] },
          { type: 'column', content: [{ type: 'paragraph' }] },
          { type: 'column', content: [{ type: 'paragraph' }] },
        ]
      }).run()
    },
  },
  
  // MEDIA
  {
    title: 'Image',
    description: 'Upload an image',
    shortcut: 'img',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
    category: 'media',
    keywords: ['photo', 'file', 'image', 'upload', 'picture'],
    command: async ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).run()
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        const fd = new FormData()
        fd.append('file', file)
        const context = getUploadContext(editor)
        if (context.wikiSlug) fd.append('wikiSlug', context.wikiSlug)
        fd.append('mediaType', file.type.startsWith('video/') ? 'video' : 'image')
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: fd })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Upload failed')
          editor.chain().focus().setImage({ src: data.url }).run()
        } catch (e: any) {
          alert('Upload error: ' + (e?.message || 'unknown'))
        }
      }
      input.click()
    },
  },
  {
    title: 'Image Slider',
    description: 'Create an image carousel',
    shortcut: 'gallery',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="2" x2="7" y1="7" y2="7"/><line x1="2" x2="7" y1="17" y2="17"/><line x1="17" x2="22" y1="7" y2="7"/><line x1="17" x2="22" y1="17" y2="17"/></svg>',
    category: 'media',
    keywords: ['gallery', 'carousel', 'images', 'slider', 'slideshow'],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).run()
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = true
      input.onchange = async () => {
        const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'))
        if (!files.length) return
        const context = getUploadContext(editor)
        try {
          const uploads = await Promise.all(files.map(async (file) => {
            const formData = new FormData()
            formData.append('file', file)
            if (context.wikiSlug) formData.append('wikiSlug', context.wikiSlug)
            formData.append('mediaType', file.type.startsWith('video/') ? 'video' : 'image')
            const res = await fetch('/api/upload', { method: 'POST', body: formData })
            if (!res.ok) {
              const data = await res.json().catch(() => ({}))
              throw new Error(data.error || 'Upload failed')
            }
            const data = await res.json()
            if (!data?.url) {
              throw new Error('Upload failed')
            }
            return data.url as string
          }))
          if (!uploads.length) return
          editor.chain().focus().insertImageSlider({ images: uploads }).run()
        } catch (error: any) {
          console.error('Image slider upload failed', error)
          alert(error?.message || 'Failed to upload images for slider')
        }
      }
      input.click()
    },
  },
  {
    title: 'Video',
    description: 'Upload a video file',
    shortcut: 'vid',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    category: 'media',
    keywords: ['video', 'file', 'mp4', 'upload', 'movie'],
    command: async ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).run()
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'video/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        const fd = new FormData()
        fd.append('file', file)
        const context = getUploadContext(editor)
        if (context.wikiSlug) fd.append('wikiSlug', context.wikiSlug)
        fd.append('mediaType', 'video')
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: fd })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Upload failed')
          const url = data.url as string | undefined
          if (!url) throw new Error('Upload failed')
          const provider = (data.provider as string | undefined) || (url.includes('vimeo.com') ? 'vimeo' : undefined)
          editor
            .chain()
            .focus()
            .insertVideo({
              src: url,
              provider,
              controls: provider === 'vimeo' ? false : true,
            })
            .run()
          if (provider === 'vimeo') {
            alert('Uploaded to Vimeo. It may take a moment before the video becomes playable.')
          }
        } catch (e: any) {
          alert('Upload error: ' + (e?.message || 'unknown'))
        }
      }
      input.click()
    },
  },
]

type SlashCommandOptions = {
  suggestion: Partial<SuggestionOptions>
  getUploadContext?: () => UploadContext
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slash-command',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range })
        },
        items: ({ query }: any) => {
          return items.filter((item) => {
            const q = query.toLowerCase()
            return (
              item.title.toLowerCase().includes(q) ||
              item.description?.toLowerCase().includes(q) ||
              item.keywords?.some((k) => k.toLowerCase().includes(q))
            )
          })
        },
        render: () => {
          let component: HTMLDivElement
          let selectedIndex = 0
          let filteredItems: SlashItem[] = []
          let commandFn: any

          const updateSelection = (container: HTMLDivElement, index: number) => {
            const buttons = container.querySelectorAll('[data-slash-item]')
            buttons.forEach((btn, i) => {
              if (i === index) {
                btn.classList.add('slash-item-active')
              } else {
                btn.classList.remove('slash-item-active')
              }
            })
          }

          return {
            onStart: (props: any) => {
              component = document.createElement('div')
              component.className = 'slash-command-menu'
              document.body.appendChild(component)
              filteredItems = props.items
              commandFn = props.command
              selectedIndex = 0
              renderList(component, props, selectedIndex)
            },
            onUpdate: (props: any) => {
              filteredItems = props.items
              commandFn = props.command
              selectedIndex = 0
              renderList(component, props, selectedIndex)
            },
            onKeyDown: (props: any) => {
              const { event } = props
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                selectedIndex = (selectedIndex + 1) % filteredItems.length
                updateSelection(component, selectedIndex)
                return true
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length
                updateSelection(component, selectedIndex)
                return true
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                if (filteredItems[selectedIndex]) {
                  commandFn(filteredItems[selectedIndex])
                }
                return true
              }
              if (event.key === 'Escape') {
                return true
              }
              return false
            },
            onExit: () => {
              component.remove()
            },
          }
        },
      },
      getUploadContext: () => ({}),
    }
  },
  addStorage() {
    return {
      getUploadContext: this.options.getUploadContext,
    }
  },
  onUpdate() {
    this.storage.getUploadContext = this.options.getUploadContext
  },
  addProseMirrorPlugins() {
    // @ts-ignore
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })]
  },
})

function getCategoryIcon(category?: string): string {
  switch (category) {
    case 'text': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>'
    case 'media': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>'
    case 'structure': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>'
    case 'code': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
    default: return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>'
  }
}

function getCategoryLabel(category?: string): string {
  switch (category) {
    case 'text': return 'Text'
    case 'media': return 'Media'
    case 'structure': return 'Structure'
    case 'code': return 'Code'
    default: return 'Other'
  }
}

function renderList(container: HTMLDivElement, { items, command, clientRect }: any, selectedIndex: number) {
  container.innerHTML = ''
  
  // Group items by category
  const grouped = items.reduce((acc: Record<string, SlashItem[]>, item: SlashItem) => {
    const cat = item.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const categoryOrder = ['text', 'code', 'structure', 'media']
  let itemIndex = 0

  categoryOrder.forEach(cat => {
    if (!grouped[cat] || grouped[cat].length === 0) return

    // Category header
    const header = document.createElement('div')
    header.className = 'slash-category-header'
    header.innerHTML = `<span class="slash-category-icon">${getCategoryIcon(cat)}</span><span>${getCategoryLabel(cat)}</span>`
    container.appendChild(header)

    // Items
    grouped[cat].forEach((item: SlashItem) => {
      const btn = document.createElement('button')
      btn.className = 'slash-command-item' + (itemIndex === selectedIndex ? ' slash-item-active' : '')
      btn.setAttribute('data-slash-item', 'true')
      
      btn.innerHTML = `
        <div class="slash-item-icon">${item.icon || '•'}</div>
        <div class="slash-item-content">
          <div class="slash-item-title">${item.title}</div>
          ${item.description ? `<div class="slash-item-description">${item.description}</div>` : ''}
        </div>
        ${item.shortcut ? `<div class="slash-item-shortcut">${item.shortcut}</div>` : ''}
      `
      
      btn.addEventListener('click', () => command(item))
      btn.addEventListener('mouseenter', () => {
        container.querySelectorAll('[data-slash-item]').forEach(el => el.classList.remove('slash-item-active'))
        btn.classList.add('slash-item-active')
      })
      container.appendChild(btn)
      itemIndex++
    })
  })

  // Position the menu
  const rect = clientRect?.()
  if (rect) {
    const scrollX = typeof window !== 'undefined' ? window.scrollX : 0
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    const menuHeight = 400 // Approximate max height
    
    // Determine if we should show above or below
    const spaceBelow = viewportHeight - rect.bottom
    const showAbove = spaceBelow < menuHeight && rect.top > menuHeight

    container.style.position = 'absolute'
    container.style.left = scrollX + rect.left + 'px'
    
    if (showAbove) {
      container.style.bottom = (viewportHeight - rect.top - scrollY + 8) + 'px'
      container.style.top = 'auto'
    } else {
      container.style.top = scrollY + rect.bottom + 8 + 'px'
      container.style.bottom = 'auto'
    }
    
    container.style.zIndex = '9999'
  }
}
