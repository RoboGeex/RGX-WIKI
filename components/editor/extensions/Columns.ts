import { Node, mergeAttributes } from '@tiptap/core'

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  defining: true,
  isolating: true,
  parseHTML() {
    return [
      { tag: 'div[data-type="column"]' },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'column-layout' }), 0]
  },
})

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column+',
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      count: {
        default: 2,
        parseHTML: element => element.getAttribute('data-columns-count') || 2,
        renderHTML: attributes => ({
          'data-columns-count': attributes.count,
          style: `--columns-count: ${attributes.count}`,
        }),
      },
    }
  },
  parseHTML() {
    return [
      { tag: 'div[data-type="columns"]' },
    ]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columns', class: 'columns-layout' }), 0]
  },
})
