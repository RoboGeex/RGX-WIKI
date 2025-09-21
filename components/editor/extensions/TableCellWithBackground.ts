import { TableCell as BaseTableCell } from '@tiptap/extension-table-cell'

// Extends TableCell to support a backgroundColor attribute on cells
export const TableCellWithBackground = BaseTableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => (element as HTMLElement).style.backgroundColor || null,
        renderHTML: attributes => {
          const { backgroundColor } = attributes as { backgroundColor?: string | null }
          if (!backgroundColor) return {}
          return { style: `background-color: ${backgroundColor}` }
        },
      },
    }
  },
})

export default TableCellWithBackground

