
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import React, { useEffect, useState, useRef } from 'react'
import { AlignLeft, AlignCenter, AlignRight, Maximize, RefreshCw, Loader2, Trash2 } from 'lucide-react'
import { RichCaptionInput } from './RichCaptionInput'
import { NodeViewErrorBoundary } from './NodeViewErrorBoundary'

const isListNodeType = (typeName?: string | null) =>
  typeName === 'listItem' || typeName === 'bulletList' || typeName === 'orderedList'

const ResizableImageComponent = (props: any) => {
  const { node, updateAttributes, selected, deleteNode, editor, getPos } = props
  const [width, setWidth] = useState(node.attrs.width || '100%')
  const [textAlign, setTextAlign] = useState(node.attrs.textAlign || 'center') // left | center | right
  const [caption, setCaption] = useState(node.attrs.title || '')
  const [layoutMode, setLayoutMode] = useState(node.attrs.layoutMode || 'fit') // fit | 1:1 | 16:9
  const [isReplacing, setIsReplacing] = useState(false)
  const [isInsideListByDom, setIsInsideListByDom] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
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
  const toolbarPositionClass =
    effectiveAlign === 'left'
      ? 'left-0'
      : effectiveAlign === 'right'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2'
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
    setCaption(node.attrs.title || '')
    setLayoutMode(node.attrs.layoutMode || 'fit')
  }, [node.attrs.width, node.attrs.textAlign, node.attrs.title, node.attrs.layoutMode])

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

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const handleBlur = () => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    // Always flush latest caption on blur (even if debounce hasn't fired)
    try {
      if (caption !== node.attrs.title) {
        updateAttributes({ title: caption })
      }
    } catch {
      // Retry once if updateAttributes fails due to stale node
      setTimeout(() => {
        try { updateAttributes({ title: caption }) } catch { /* give up */ }
      }, 50)
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

  const setLayout = (m: string) => {
    updateAttributes({ layoutMode: m })
    setLayoutMode(m)
  }

  const handleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsReplacing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const urlParams = new URLSearchParams(window.location.search)
      const wikiSlug = urlParams.get('wiki')
      if (wikiSlug) formData.append('wikiSlug', wikiSlug)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      updateAttributes({ src: data.url })
    } catch (err) {
      alert('Failed to replace image')
    } finally {
      setIsReplacing(false)
      e.target.value = ''
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = imageRef.current?.offsetWidth || 0

    let latestWidthStr = `${startWidth}px`
    let hasDragged = false

    const onMouseMove = (moveEvent: MouseEvent) => {
      hasDragged = true
      const delta = moveEvent.clientX - startX
      const newW = Math.max(50, startWidth + delta)
      const wStr = `${newW}px`
      latestWidthStr = wStr
      setWidth(wStr)
    }

    const onMouseUp = () => {
      if (hasDragged) {
        updateAttributes({ width: latestWidthStr })
      }
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <NodeViewWrapper
      ref={wrapperRef as any}
      className="media-node-block flex flex-col w-full"
      style={{ textAlign: effectiveAlign as any, alignItems }}
    >
      <div className="relative block group" style={mediaWrapperStyle}>
        <div className={`relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-md ${selected ? 'ring-2 ring-primary' : ''} ${
          layoutMode === '1:1' ? 'aspect-square flex items-center justify-center' :
          layoutMode === '3:4' ? 'aspect-[3/4] flex items-center justify-center' :
          layoutMode === '2:3' ? 'aspect-[2/3] flex items-center justify-center' :
          layoutMode === '16:9' ? 'aspect-video flex items-center justify-center' :
          ''
        }`}>
          <img
            ref={imageRef}
            src={node.attrs.src}
            alt={node.attrs.alt}
            className={`w-full block !m-0 !p-0 ${
              (layoutMode === '1:1' || layoutMode === '3:4' || layoutMode === '2:3' || layoutMode === '16:9') ? 'object-cover h-full' : 'h-auto object-cover'
            }`}
          />
          {/* Resize Handle */}
          {selected && (
            <div
              className="absolute bottom-2 right-2 p-1.5 bg-white/90 shadow-sm border border-gray-200 rounded cursor-ew-resize hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity z-20"
              onMouseDown={handleMouseDown}
              title="Drag to resize"
            >
              <Maximize size={14} className="text-gray-500 rotate-90" />
            </div>
          )}
        </div>

        {/* Caption Input */}
        <div className="mt-1 w-full flex justify-center text-center mx-auto relative z-10">
          <NodeViewErrorBoundary>
            <RichCaptionInput
              initialContent={caption}
              onChange={(html) => {
                setCaption(html)
                // Debounce parent attribute update to avoid focus-stealing re-renders
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
                debounceTimerRef.current = setTimeout(() => {
                  updateAttributes({ title: html })
                }, 300)
              }}
              onBlur={handleBlur}
              placeholder="Add a caption..."
            />
          </NodeViewErrorBoundary>
        </div>

        {/* Toolbar */}
        {selected && (
          <div className={`absolute -top-12 ${toolbarPositionClass} flex items-center gap-1 bg-white/95 backdrop-blur shadow-lg rounded-lg border border-gray-200 p-1.5 z-50 whitespace-nowrap min-w-max`}>

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

            {/* Aspect Ratio */}
            <div className="flex gap-1 border-r border-gray-200 pr-1 mr-1">
              <button type="button" onClick={(e) => { e.preventDefault(); setLayout('fit'); }} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${layoutMode === 'fit' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>Fit</button>
              <button type="button" onClick={(e) => { e.preventDefault(); setLayout('1:1'); }} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${layoutMode === '1:1' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>1:1</button>
              <button type="button" onClick={(e) => { e.preventDefault(); setLayout('3:4'); }} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${layoutMode === '3:4' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>3:4</button>
              <button type="button" onClick={(e) => { e.preventDefault(); setLayout('2:3'); }} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${layoutMode === '2:3' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>2:3</button>
              <button type="button" onClick={(e) => { e.preventDefault(); setLayout('16:9'); }} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${layoutMode === '16:9' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>16:9</button>
            </div>

            {/* Presets */}
            <div className="flex gap-1 border-r border-gray-200 pr-1 mr-1">
              <button onClick={() => setSize('25%')} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${width === '25%' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>25%</button>
              <button onClick={() => setSize('50%')} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${width === '50%' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>50%</button>
              <button onClick={() => setSize('75%')} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${width === '75%' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>75%</button>
              <button onClick={() => setSize('100%')} className={`px-2 text-xs font-medium rounded hover:bg-gray-100 ${width === '100%' ? 'text-primary bg-primary/10' : 'text-gray-600'}`}>100%</button>
            </div>

            {/* Replace */}
            <label className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded cursor-pointer hover:bg-gray-100 text-gray-600 ${isReplacing ? 'opacity-50 pointer-events-none' : ''}`} title="Replace image">
              {isReplacing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              <span>Replace</span>
              <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={handleReplace} disabled={isReplacing} />
            </label>

            {/* Remove */}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (typeof deleteNode === 'function') deleteNode(); }}
              className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-600 ml-0.5"
              title="Remove image"
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

export default Image.extend({
  name: 'image',
  inline: false,
  group: 'block',

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
      textAlign: {
        default: 'center',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-align': attributes.textAlign,
          style: `text-align: ${attributes.textAlign}`
        }),
      },
      layoutMode: {
        default: 'fit',
        renderHTML: (attributes: Record<string, any>) => ({
          'data-layout-mode': attributes.layoutMode,
        }),
      }
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  }
})
