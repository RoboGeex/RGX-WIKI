import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import TagBlockComponent from './TagBlockComponent'

export interface TagBlockOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tagBlock: {
      insertTagBlock: (options?: { title?: string; tags?: string[] }) => ReturnType
    }
  }
}

const TagBlock = Node.create<TagBlockOptions>({
  name: 'tagBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'tiptap-tag-block',
      },
    }
  },

  addAttributes() {
    return {
      title: {
        default: '',
      },
      tags: {
        default: [],
        parseHTML: (element) => {
          const raw = element.getAttribute('data-tags')
          if (!raw) return []
          try {
            const parsed = JSON.parse(raw)
            if (!Array.isArray(parsed)) return []
            return parsed
              .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
              .filter((tag) => tag.length > 0)
          } catch {
            return []
          }
        },
        renderHTML: (attributes) => ({
          'data-tags': JSON.stringify(Array.isArray(attributes.tags) ? attributes.tags : []),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tag-block"]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const title = typeof node.attrs?.title === 'string' ? node.attrs.title : ''
    const tags = Array.isArray(node.attrs?.tags) ? node.attrs.tags : []
    return [
      'div',
      mergeAttributes(
        { 'data-type': 'tag-block' },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      ['p', { class: 'tiptap-tag-block-title' }, title],
      ['div', { class: 'tiptap-tag-block-chips' }, ...tags.map((tag: string) => ['span', { class: 'tiptap-tag-chip' }, tag])],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TagBlockComponent)
  },

  addCommands() {
    return {
      insertTagBlock:
        (options) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: {
                title: typeof options?.title === 'string' ? options.title.trim() : '',
                tags: Array.isArray(options?.tags)
                  ? options!.tags
                      .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
                      .filter((tag) => tag.length > 0)
                  : [],
              },
            })
            .run(),
    }
  },
})

export default TagBlock
