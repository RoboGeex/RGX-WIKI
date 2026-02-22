import { NodeViewWrapper } from '@tiptap/react'
import React, { useState, useEffect, useRef } from 'react'
import { AlignLeft, AlignCenter, AlignRight, Maximize, Trash2 } from 'lucide-react'

export default function VideoComponent(props: any) {
  const { node, updateAttributes, selected, deleteNode, editor } = props
  const provider = node.attrs.provider || (typeof node.attrs.src === 'string' && node.attrs.src.includes('vimeo.com') ? 'vimeo' : null)
  
  const [caption, setCaption] = useState(node.attrs.title || '')
  const [width, setWidth] = useState(node.attrs.width || '100%')
  const [align, setAlign] = useState(node.attrs.align || 'center') // left | center | right
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCaption(node.attrs.title || '')
    setWidth(node.attrs.width || '100%')
    setAlign(node.attrs.align || 'center')
  }, [node.attrs.title, node.attrs.width, node.attrs.align])

  const handleBlur = () => {
    if (caption !== node.attrs.title) {
      updateAttributes({ title: caption })
    }
  }

  const removeVideo = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof deleteNode === 'function') {
      deleteNode()
    }
  }

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
    const startWidth = containerRef.current?.offsetWidth || 0
    
    const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX
        const newW = Math.max(50, startWidth + delta) // Min 50px
        const wStr = `${newW}px`
        setWidth(wStr)
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
    <NodeViewWrapper className={`my-10 flex flex-col items-${align === 'left' ? 'start' : align === 'right' ? 'end' : 'center'} w-full relative`} style={{ textAlign: align as any }}>
      <div className="relative inline-block group w-full" style={{ width: width, maxWidth: '100%' }}>
        {/* Vimeo: needs aspect-ratio container since the iframe self-sizes to fill it */}
        {provider === 'vimeo' ? (
          <div ref={containerRef} className={`relative w-full aspect-video overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm ${selected ? 'ring-2 ring-primary' : ''}`}>
            <iframe
              src={node.attrs.src}
              title={node.attrs.title || 'Vimeo video'}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="h-full w-full block"
            />
            {/* Editor Controls */}
            {editor?.isEditable && (
              <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={removeVideo}
                  className="p-1.5 bg-red-500/80 backdrop-blur-sm rounded text-white hover:bg-red-500 transition-colors shadow-sm"
                  title="Delete video"
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Native video: let the browser control height so controls are never clipped */
          <div ref={containerRef} className={`relative w-full rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${selected ? 'ring-2 ring-primary' : ''}`}>
            <video
              controls
              src={node.attrs.src}
              poster={node.attrs.poster || undefined}
              className="w-full block"
              style={{ display: 'block' }}
            />
            {/* Editor Controls */}
            {editor?.isEditable && (
              <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={removeVideo}
                  className="p-1.5 bg-red-500/80 backdrop-blur-sm rounded text-white hover:bg-red-500 transition-colors shadow-sm"
                  title="Delete video"
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resize Handle (Free Drag) */}
        {selected && (
           <div 
             className="absolute bottom-2 right-2 p-1.5 bg-white/90 shadow-sm border border-gray-200 rounded cursor-ew-resize hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity z-20"
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

        {/* Caption Input */}
        <div className="mt-2 w-full flex justify-center">
          <input
            type="text"
            className="w-full max-w-sm text-center text-sm text-gray-500 bg-transparent border border-transparent hover:border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded px-2 py-1 outline-none transition-colors placeholder:text-gray-300 relative z-10"
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
              // Stop TipTap from catching keyboard events while typing in the caption
              e.stopPropagation()
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
          />
        </div>
      </div>
    </NodeViewWrapper>
  )
}
