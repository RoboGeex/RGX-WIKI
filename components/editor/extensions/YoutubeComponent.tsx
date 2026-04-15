import { NodeViewWrapper } from '@tiptap/react'
import React, { useState, useEffect, useRef } from 'react'
import { AlignLeft, AlignCenter, AlignRight, Maximize, Trash2 } from 'lucide-react'

export default function YoutubeComponent(props: any) {
  const { node, updateAttributes, selected, deleteNode, editor } = props
  const provider = 'youtube'

  const [width, setWidth] = useState(node.attrs.width || '100%')
  const [textAlign, setTextAlign] = useState(node.attrs.textAlign || 'center') // left | center | right
  const containerRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    setWidth(node.attrs.width || '100%')
    setTextAlign(node.attrs.textAlign || 'center')
  }, [node.attrs.width, node.attrs.textAlign])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const safeUpdateAttributes = (attrs: Record<string, any>) => {
    if (!isMountedRef.current) return
    try {
      updateAttributes(attrs)
    } catch (error) {
      console.warn('Skipped stale youtube attribute update:', error)
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
    safeUpdateAttributes({ width: w })
    setWidth(w)
  }

  const setAlignment = (a: string) => {
    safeUpdateAttributes({ textAlign: a })
    setTextAlign(a)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = containerRef.current?.offsetWidth || 0

    let latestWidthStr = `${startWidth}px`

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newW = Math.max(50, startWidth + delta) // Min 50px
      const wStr = `${newW}px`
      latestWidthStr = wStr
      setWidth(wStr)
      // Deferred attribute update to mouse up to prevent 'Maximum update depth exceeded' error
    }

    const onMouseUp = () => {
      safeUpdateAttributes({ width: latestWidthStr })
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <NodeViewWrapper className={`mt-2 mb-6 flex flex-col items-${textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'center'} w-full relative group`} style={{ textAlign: textAlign as any }}>
      <div className="relative inline-block group w-full" style={{ width: width, maxWidth: '100%' }}>
        <div ref={containerRef} className={`relative w-full aspect-video overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm flex items-center justify-center ${selected ? 'ring-2 ring-primary' : ''}`}>
          <iframe
            src={node.attrs.src}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
              <button onClick={() => setAlignment('left')} className={`p-1 rounded hover:bg-gray-100 ${textAlign === 'left' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>
                <AlignLeft size={16} />
              </button>
              <button onClick={() => setAlignment('center')} className={`p-1 rounded hover:bg-gray-100 ${textAlign === 'center' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>
                <AlignCenter size={16} />
              </button>
              <button onClick={() => setAlignment('right')} className={`p-1 rounded hover:bg-gray-100 ${textAlign === 'right' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>
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
