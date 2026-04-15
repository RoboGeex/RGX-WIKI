import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { X, Columns as ColumnsIcon } from 'lucide-react'

export default function ColumnsComponent(props: any) {
  const { node, deleteNode } = props
  const count = node.attrs.count || 2

  return (
    <NodeViewWrapper className="group relative tiptap-columns-wrapper">
      {/* 
        This absolute positioned toolbar will only show up when the user hovers 
        over the columns layout. The top position is -1rem to place it perfectly 
        above the columns. 
      */}
      <div 
        className="absolute -top-4 right-2 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded-md shadow z-50"
        contentEditable={false}
      >
        <div className="text-[10px] uppercase font-bold text-gray-500 px-2 py-1 select-none flex items-center gap-1 border-r border-gray-100">
          <ColumnsIcon size={12} />
          {count} Columns
        </div>
        <button 
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            deleteNode()
          }} 
          className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-r-sm transition-colors"
          title="Delete columns block"
        >
          <X size={14} />
        </button>
      </div>

      <NodeViewContent 
        className="columns-layout" 
        style={{ '--columns-count': count } as React.CSSProperties}
        data-type="columns"
        data-columns-count={count}
      />
    </NodeViewWrapper>
  )
}
