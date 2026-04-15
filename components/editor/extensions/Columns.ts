import { Node, mergeAttributes } from '@tiptap/core'
import { TextSelection, Selection, Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      insertColumns: (attrs: { count: number }) => ReturnType,
    }
  }
}

export const Column = Node.create({
  name: 'column',
  content: 'block+',
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
  addCommands() {
    return {
      insertColumns: (attrs: { count: number }) => ({ tr, dispatch, editor }) => {
        const count = attrs.count || 2
        const content = Array.from({ length: count }, () => 
          editor.schema.nodes.column.create(null, [
            editor.schema.nodes.paragraph.create()
          ])
        )

        const columnsNode = editor.schema.nodes.columns.create({ count }, content)

        if (dispatch) {
          tr.replaceSelectionWith(columnsNode)
          
          // Selection is now right after the columns block.
          const nodeSize = columnsNode.nodeSize
          const endPos = tr.selection.from
          const startPos = endPos - nodeSize
          
          // Target the first paragraph in the first column
          const targetPos = startPos + 3
          
          tr.setSelection(TextSelection.create(tr.doc, targetPos))
          tr.scrollIntoView()
        }

        return true
      },
    }
  },
  addKeyboardShortcuts() {
    const handleCleanup = () => {
      const { state } = this.editor
      const dispatch = this.editor.view.dispatch
      const { selection } = state
      const { empty, $anchor } = selection

      // Find if we are inside a columns block
      let depth = $anchor.depth
      let columnsPos: number | null = null
      let columnsNode: ReturnType<typeof state.doc.nodeAt> = null
      for (let i = depth; i > 0; i--) {
        if ($anchor.node(i).type.name === 'columns') {
          columnsNode = $anchor.node(i)
          columnsPos = $anchor.before(i)
          break
        }
      }

      if (!columnsNode || columnsPos == null) return false

      let targetTr = state.tr
      let targetColumnsPos = columnsPos
      let targetColumnsNode = columnsNode

      if (!empty) {
        // User highlighted text. Simulate what the document looks like AFTER deletion.
        targetTr.deleteSelection()
        targetColumnsPos = targetTr.mapping.map(columnsPos)
        targetColumnsNode = targetTr.doc.nodeAt(targetColumnsPos)!
        
        // If the columns block didn't survive at all, just let default behavior run
        if (!targetColumnsNode || targetColumnsNode.type.name !== 'columns') {
          return false
        }
      }

      let isTotallyEmpty = true
      
      // 1. Must have no text at all
      if (targetColumnsNode.textContent.trim().length > 0) {
        isTotallyEmpty = false
      }

      // 2. Must not have any solid media blocks
      if (isTotallyEmpty) {
        targetColumnsNode.descendants((node) => {
          if (node.isLeaf && node.type.name !== 'text' && node.type.name !== 'hard_break') {
            isTotallyEmpty = false
          }
        })
      }

      if (isTotallyEmpty) {
        // The columns block is fully empty (or would become empty).
        // Destroy it entirely and place the user in a fresh paragraph.
        if (dispatch) {
          const paragraph = state.schema.nodes.paragraph.create()
          targetTr.replaceWith(targetColumnsPos, targetColumnsPos + targetColumnsNode.nodeSize, paragraph)
          targetTr.setSelection(TextSelection.create(targetTr.doc, targetColumnsPos + 1))
          dispatch(targetTr)
        }
        return true
      }

      return false
    }

    return {
      Backspace: handleCleanup,
      Delete: handleCleanup,
    }
  },
  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        key: new PluginKey('columns-auto-paragraph'),
        appendTransaction: (transactions, oldState, newState) => {
          if (newState.doc === oldState.doc) return null
          
          const { tr, doc } = newState
          let changed = false

          doc.descendants((node, pos) => {
            if (changed) return false
            if (node.type.name === 'column') {
              const lastChild = node.lastChild
              // If the column is empty (should not happen but for safety) or ends with 
              // a non-text block (like an hr, media, etc.), append a paragraph.
              if (!lastChild || (
                lastChild.type.name === 'horizontalRule' || 
                lastChild.type.name === 'video' || 
                lastChild.type.name === 'image' || 
                lastChild.type.name === 'imageSlider' ||
                lastChild.type.name === 'youtube' ||
                lastChild.type.name === 'table' ||
                lastChild.type.name === 'tagBlock'
              )) {
                const paragraph = newState.schema.nodes.paragraph.create()
                tr.insert(pos + node.nodeSize - 1, paragraph)
                changed = true
              }
            }
            return true
          })

          return changed ? tr : null
        },
      }),
      new Plugin({
        key: new PluginKey('columns-delete-button'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (node.type.name === 'columns') {
                const widget = Decoration.widget(pos, () => {
                  // Container — sits at the top-right of the columns block
                  const wrapper = document.createElement('div')
                  wrapper.className = 'columns-delete-toolbar'
                  wrapper.contentEditable = 'false'

                  // Label
                  const label = document.createElement('span')
                  label.className = 'columns-delete-label'
                  const count = node.attrs.count || 2
                  label.textContent = `${count} Columns`
                  wrapper.appendChild(label)

                  // Delete button
                  const btn = document.createElement('button')
                  btn.className = 'columns-delete-btn'
                  btn.title = 'Delete columns block'
                  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
                  btn.addEventListener('mousedown', (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    const tr = editor.state.tr
                    const currentNode = tr.doc.nodeAt(pos)
                    if (currentNode && currentNode.type.name === 'columns') {
                      const paragraph = editor.state.schema.nodes.paragraph.create()
                      tr.replaceWith(pos, pos + currentNode.nodeSize, paragraph)
                      tr.setSelection(TextSelection.create(tr.doc, pos + 1))
                      editor.view.dispatch(tr)
                    }
                  })
                  wrapper.appendChild(btn)

                  return wrapper
                }, { side: -1 })
                decorations.push(widget)
              }
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
