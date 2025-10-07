import { Extension } from '@tiptap/core'
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion'

export type SlashItem = {
  title: string
  shortcut?: string
  keywords?: string[]
  command: (props: any) => void
}

const items: SlashItem[] = [
  {
    title: 'Heading 1',
    shortcut: '#',
    keywords: ['h1', 'title'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    shortcut: '##',
    keywords: ['h2'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    shortcut: '###',
    keywords: ['h3'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
  },
  {
    title: 'Paragraph',
    shortcut: 'P',
    keywords: ['text'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: 'Link',
    shortcut: 'Ctrl+K',
    keywords: ['url', 'hyperlink'],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).run()
      const url = window.prompt('Enter link URL')
      if (!url) return
      editor.chain().focus().setLink({ href: url }).run()
    },
  },
  {
    title: 'Bullet List',
    shortcut: '•',
    keywords: ['list', 'ul'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    shortcut: '1.',
    keywords: ['list', 'ol'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Callout',
    shortcut: 'Tip',
    keywords: ['note', 'info', 'callout'],
    command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    title: 'Image',
    shortcut: 'Img',
    keywords: ['picture', 'photo'],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).run()
      const url = window.prompt('Image URL')
      if (url) editor.chain().focus().setImage({ src: url }).run()
    },
  },
  {
    title: 'YouTube',
    shortcut: 'YT',
    keywords: ['video', 'embed'],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).run()
      const url = window.prompt('YouTube URL')
      if (!url) return
      editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 })
    },
  },
  {
    title: 'Table',
    shortcut: 'tbl',
    keywords: ['grid'],
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
  },
  {
    title: 'Upload Image',
    shortcut: 'U Img',
    keywords: ['photo', 'file', 'image'],
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
    title: 'Upload Video',
    shortcut: 'U Vid',
    keywords: ['video', 'file', 'mp4'],
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
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: fd })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Upload failed')
          // Insert as simple HTML video node placeholder via paragraph
          const url = data.url
          editor.chain().focus().insertVideo({ src: url }).run()
        } catch (e: any) {
          alert('Upload error: ' + (e?.message || 'unknown'))
        }
      }
      input.click()
    },
  },
]

export const SlashCommand = Extension.create<{ suggestion: Partial<SuggestionOptions> }>({
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
              item.keywords?.some((k) => k.toLowerCase().includes(q))
            )
          })
        },
        render: () => {
          let component: HTMLDivElement
          let onKeyDown: ((props: any) => boolean) | undefined
          return {
            onStart: (props: any) => {
              component = document.createElement('div')
              component.className = 'rounded-xl border bg-white shadow-lg p-2 w-72 text-sm'
              document.body.appendChild(component)
              renderList(component, props)
            },
            onUpdate: (props: any) => {
              renderList(component, props)
            },
            onKeyDown: (props: any) => (onKeyDown ? onKeyDown(props) : false),
            onExit: () => {
              component.remove()
            },
          }
        },
      },
    }
  },
  addProseMirrorPlugins() {
    // @ts-ignore
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })]
  },
})

function renderList(container: HTMLDivElement, { items, command, clientRect }: any) {
  container.innerHTML = ''
  const list = document.createElement('div')
  items.forEach((item: SlashItem) => {
    const btn = document.createElement('button')
    btn.className = 'w-full text-left px-3 py-2 rounded-md hover:bg-gray-100'
    btn.innerHTML = `${item.title}${item.shortcut ? ` <span class="float-right text-xs text-gray-400">${item.shortcut}</span>` : ''}`
    btn.addEventListener('click', () => command(item))
    list.appendChild(btn)
  })
  container.appendChild(list)
  const rect = clientRect?.()
  if (rect) {
    container.style.position = 'absolute'
    container.style.left = rect.left + 'px'
    container.style.top = rect.bottom + 6 + 'px'
    container.style.zIndex = '90'
  }
}
