
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import React, { useEffect, useState, useRef } from 'react'
import { AlignLeft, AlignCenter, AlignRight, GripVertical, Maximize } from 'lucide-react'

const ResizableImageComponent = (props: any) => {
  const { node, updateAttributes, selected } = props
  const [width, setWidth] = useState(node.attrs.width || '100%')
  const [align, setAlign] = useState(node.attrs.align || 'center') // left | center | right
  const imageRef = useRef<HTMLImageElement>(null)
  
  useEffect(() => {
    setWidth(node.attrs.width || '100%')
    setAlign(node.attrs.align || 'center')
  }, [node.attrs.width, node.attrs.align])

  const setSize = (w: string) => {
    updateAttributes({ width: w })
    setWidth(w)
  }

  const setAlignment = (a: string) => {
    updateAttributes({ align: a })
    setAlign(a)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    // Get current width in pixels
    const startWidth = imageRef.current?.offsetWidth || 0
    // Get parent width to potentially calculate percentage? No, stick to pixels for free drag.
    
    const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX
        const newW = Math.max(50, startWidth + delta) // Min 50px
        const wStr = `${newW}px`
        setWidth(wStr)
        // Defer attribute update to mouse up for performance? 
        // TipTap handles updates fine usually. Live update feels better.
        updateAttributes({ width: wStr }) 
    }

    const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <NodeViewWrapper className={`my-10 flex flex-col ${align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center'} w-full`} style={{ textAlign: align as any }}>
      <div className="relative inline-block group w-full" style={{ width: width, maxWidth: '100%' }}>
        <div className={`relative w-full aspect-[1920/720] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm flex items-center justify-center ${selected ? 'ring-2 ring-primary' : ''}`}>
          <img
            ref={imageRef}
            src={node.attrs.src}
            alt={node.attrs.alt}
            title={node.attrs.title}
            className="h-full w-full object-contain"
          />
        </div>
        
        {/* Resize Handle (Free Drag) */}
        {selected && (
           <div 
             className="absolute bottom-2 right-2 p-1.5 bg-white/90 shadow-sm border border-gray-200 rounded cursor-ew-resize hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
             onMouseDown={handleMouseDown}
             title="Drag to resize"
           >
             <Maximize size={14} className="text-gray-500 rotate-90" />
           </div>
        )}

        {/* Toolbar */}
        {selected && (
           <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur shadow-lg rounded-lg border border-gray-200 p-1.5 z-50">
             
             {/* Alignment */}
             <div className="flex gap-0.5 border-r border-gray-200 pr-1 mr-1">
               <button onClick={() => setAlignment('left')} className={`p-1 rounded hover:bg-gray-100 ${align === 'left' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>
                 <AlignLeft size={16} />
               </button>
               <button onClick={() => setAlignment('center')} className={`p-1 rounded hover:bg-gray-100 ${align === 'center' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>
                 <AlignCenter size={16} />
               </button>
               <button onClick={() => setAlignment('right')} className={`p-1 rounded hover:bg-gray-100 ${align === 'right' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>
                 <AlignRight size={16} />
               </button>
             </div>

             {/* Presets */}
             <div className="flex gap-1">
                <button onClick={() => setSize('25%')} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${width === '25%' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>25%</button>
                <button onClick={() => setSize('50%')} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${width === '50%' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>50%</button>
                <button onClick={() => setSize('75%')} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${width === '75%' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>75%</button>
                <button onClick={() => setSize('100%')} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${width === '100%' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>100%</button>
             </div>

           </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export default Image.extend({
  name: 'image',
  
  addAttributes() {
    return {
      // @ts-ignore
      ...this.parent?.(),
      width: {
        default: '100%',
        renderHTML: (attributes: Record<string, any>) => ({
          width: attributes.width,
          style: `width: ${attributes.width}`
        }),
      },
      height: {
        default: null,
      },
      align: {
        default: 'center',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-align': attributes.align,
          style: `text-align: ${attributes.align}`
        }),
      }
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  }
})
