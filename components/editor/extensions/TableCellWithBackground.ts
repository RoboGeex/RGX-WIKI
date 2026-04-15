import { TableCell as BaseTableCell } from '@tiptap/extension-table-cell'
import { TableHeader as BaseTableHeader } from '@tiptap/extension-table-header'
import { mergeAttributes } from '@tiptap/core'

/**
 * Custom Table Cell extension that adds a 'backgroundColor' attribute to every 'td' node.
 * This ensures the user can set custom colors from the floating bubble menu.
 */
export const TableCellWithBackground = BaseTableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => {
          const style = (element as HTMLElement).getAttribute('style') || ''
          const match = style.match(/background-color\s*:\s*([^! ;]+)/i)
          return match ? match[1] : (element as HTMLElement).style.backgroundColor || null
        },
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {}
          }
          return {
            style: `background-color: ${attributes.backgroundColor} !important;`,
          }
        },
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['td', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})

/**
 * Custom Table Header extension that adds a 'backgroundColor' attribute to every 'th' node.
 * This ensures header rows/columns can be colored just like regular cells.
 */
export const TableHeaderWithBackground = BaseTableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => {
          const style = (element as HTMLElement).getAttribute('style') || ''
          const match = style.match(/background-color\s*:\s*([^! ;]+)/i)
          return match ? match[1] : (element as HTMLElement).style.backgroundColor || null
        },
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {}
          }
          return {
            style: `background-color: ${attributes.backgroundColor} !important;`,
          }
        },
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['th', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
})

export default TableCellWithBackground
