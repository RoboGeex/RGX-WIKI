import { NodeViewWrapper } from '@tiptap/react'
import React, { useState, useEffect, useRef } from 'react'
import { AlignLeft, AlignCenter, AlignRight, Maximize, Trash2 } from 'lucide-react'

const isListNodeType = (typeName?: string | null) =>
  typeName === 'listItem' || typeName === 'bulletList' || typeName === 'orderedList'

export default function YoutubeComponent(props: any) {
  const { node, updateAttributes, selected, deleteNode, editor, getPos } = props
  const provider = 'youtube'

  const [width, setWidth] = useState(node.attrs.width || '100%')
  const [textAlign, setTextAlign] = useState(node.attrs.textAlign || 'center') // left | center | right
  const [isInsideListByDom, setIsInsideListByDom] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const isInsideListByDoc = (() => {
    if (!editor?.state?.doc || typeof getPos !== 'function') return false
    try {
      const doc = editor.state.doc
      const pos = getPos()
      const $pos = doc.resolve(pos)
      let hasListAncestor = false
      for (let depth = $pos.depth; depth >= 0; depth--) {
        const typeName = $pos.node(depth).type.name
        if (isListNodeType(typeName)) {
          hasListAncestor = true
          break
        }
      }
      if (hasListAncestor) return true

      const nodeSize = typeof node?.nodeSize === 'number' ? node.nodeSize : 0
      const endPos = Math.min(pos + nodeSize, doc.content.size)
      const $end = doc.resolve(endPos)
      const isBetweenSplitLists =
        isListNodeType($pos.nodeBefore?.type?.name) &&
        isListNodeType($end.nodeAfter?.type?.name)
      if (isBetweenSplitLists) return true
    } catch {
      return false
    }
    return false
  })()
  const isInsideList = isInsideListByDoc || isInsideListByDom
  const effectiveAlign = textAlign
  const alignItems = effectiveAlign === 'left' ? 'flex-start' : effectiveAlign === 'right' ? 'flex-end' : 'center'
  const mediaWrapperStyle: React.CSSProperties = {
    width,
    maxWidth: '100%',
    marginInlineStart: effectiveAlign === 'right' ? 'auto' : '0',
    marginInlineEnd: effectiveAlign === 'left' ? 'auto' : '0',
  }

  if (effectiveAlign === 'center') {
    mediaWrapperStyle.marginInlineStart = 'auto'
    mediaWrapperStyle.marginInlineEnd = 'auto'
  }

  useEffect(() => {
    setWidth(node.attrs.width || '100%')
    setTextAlign(node.attrs.textAlign || 'center')
  }, [node.attrs.width, node.attrs.textAlign])

  useEffect(() => {
    const updateListContextFromDom = () => {
      const el = wrapperRef.current
      if (!el) return
      const prevTag = el.previousElementSibling?.tagName
      const nextTag = el.nextElementSibling?.tagName
      const isAdjacentToList =
        (prevTag === 'OL' || prevTag === 'UL') &&
        (nextTag === 'OL' || nextTag === 'UL')
      const isNestedInList = Boolean(el.closest('li, ol, ul'))
      setIsInsideListByDom(isNestedInList || isAdjacentToList)
    }

    updateListContextFromDom()
    const raf = requestAnimationFrame(updateListContextFromDom)
    return () => cancelAnimationFrame(raf)
  }, [getPos, node.attrs.textAlign, node.attrs.width])

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
    updateAttributes({ textAlign: a })
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
      updateAttributes({ width: latestWidthStr })
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <NodeViewWrapper
      ref={wrapperRef as any}
      className="media-node-block flex flex-col w-full relative group"
      style={{ textAlign: effectiveAlign as any, alignItems }}
    >
      <div className="relative block group" style={mediaWrapperStyle}>
        <div ref={containerRef} className={`relative w-full aspect-video overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm flex items-center justify-center ${selected ? 'ring-2 ring-primary' : ''}`}>
          {!selected && editor?.isEditable && (
            <div 
              className="absolute inset-0 z-20 cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (typeof props.getPos === 'function') {
                  editor.commands.setNodeSelection(props.getPos())
                }
              }}
            />
          )}
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

            {/* Remove */}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (typeof deleteNode === 'function') deleteNode(); }}
              className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-600 ml-0.5"
              title="Remove video"
              type="button"
            >
              <Trash2 size={14} />
            </button>

          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
