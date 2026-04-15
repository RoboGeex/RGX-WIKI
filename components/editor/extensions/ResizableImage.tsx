
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import React, { useEffect, useState, useRef } from 'react'
import { AlignLeft, AlignCenter, AlignRight, Maximize, RefreshCw, Loader2, Trash2 } from 'lucide-react'
import { RichCaptionInput } from './RichCaptionInput'
import { NodeViewErrorBoundary } from './NodeViewErrorBoundary'
import { NodeSelection } from '@tiptap/pm/state'

const ResizableImageComponent = (props: any) => {
  const { node, updateAttributes, selected } = props
  const [width, setWidth] = useState(node.attrs.width || '100%')
  const [textAlign, setTextAlign] = useState(node.attrs.textAlign || 'center') // left | center | right
  const [caption, setCaption] = useState(node.attrs.title || '')
  const [layoutMode, setLayoutMode] = useState(node.attrs.layoutMode || 'fit') // fit | 1:1 | 16:9
  const [isReplacing, setIsReplacing] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const pendingAttrsRef = useRef<Record<string, any> | null>(null)
  const lastKnownCaptionRef = useRef(typeof node.attrs.title === 'string' && node.attrs.title !== '<p></p>' ? node.attrs.title : '')

  useEffect(() => {
    setWidth(node.attrs.width || '100%')
    setTextAlign(node.attrs.textAlign || 'center')
    setLayoutMode(node.attrs.layoutMode || 'fit')
  }, [node.attrs.width, node.attrs.textAlign, node.attrs.layoutMode])

  useEffect(() => {
    const incomingCaption = typeof node.attrs.title === 'string' && node.attrs.title !== '<p></p>' ? node.attrs.title : ''
    setCaption((prev: string) => {
      // Some editor transactions briefly expose empty attrs; keep the latest known caption.
      if (!incomingCaption) {
        const fallback = lastKnownCaptionRef.current || prev
        return fallback ? (prev === fallback ? prev : fallback) : ''
      }
      lastKnownCaptionRef.current = incomingCaption
      return prev === incomingCaption ? prev : incomingCaption
    })
  }, [node.attrs.title])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const applyAttrsWithTransaction = (attrs: Record<string, any>) => {
    try {
      const editor = props.editor
      const getPos = props.getPos
      if (!editor?.view || typeof getPos !== 'function') return false
      const pos = getPos()
      if (typeof pos !== 'number') return false

      const state = editor.view.state
      const targetNode = state.doc.nodeAt(pos)
      if (!targetNode || targetNode.type.name !== 'image') return false

      const tr = state.tr.setNodeMarkup(pos, undefined, {
        ...targetNode.attrs,
        ...attrs,
      })
      editor.view.dispatch(tr)
      return true
    } catch {
      return false
    }
  }

  const safeUpdateAttributes = (attrs: Record<string, any>, retriesLeft = 30) => {
    if (!isMountedRef.current) return
    pendingAttrsRef.current = {
      ...(pendingAttrsRef.current || {}),
      ...attrs,
    }

    const payload = pendingAttrsRef.current

    if (applyAttrsWithTransaction(payload)) {
      pendingAttrsRef.current = null
      return
    }

    try {
      updateAttributes(payload)
      pendingAttrsRef.current = null
    } catch (error) {
      if (retriesLeft > 0) {
        setTimeout(() => safeUpdateAttributes(payload, retriesLeft - 1), 40)
        return
      }
      // Last-chance reschedule to avoid dropping caption updates during transient node-view churn.
      setTimeout(() => safeUpdateAttributes(payload, 30), 120)
      console.warn('Delayed image attribute update after transient stale state:', error)
    }
  }

  const normalizeCaption = (value: unknown) => {
    return typeof value === 'string' && value !== '<p></p>' ? value : ''
  }

  const handleBlur = (latestHtml?: string) => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    const nextCaption = normalizeCaption(typeof latestHtml === 'string' ? latestHtml : caption)
    lastKnownCaptionRef.current = nextCaption
    setCaption(nextCaption)
    // Final sync
    if (nextCaption !== normalizeCaption(node.attrs.title)) {
      safeUpdateAttributes({ title: nextCaption })
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

  const setLayout = (m: string) => {
    safeUpdateAttributes({ layoutMode: m })
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
      safeUpdateAttributes({ src: data.url })
    } catch (err) {
      alert('Failed to replace image')
    } finally {
      setIsReplacing(false)
      e.target.value = ''
    }
  }

  const removeImageNode = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (typeof props.deleteNode === 'function') {
      props.deleteNode()
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
        safeUpdateAttributes({ width: latestWidthStr })
      }
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <NodeViewWrapper className={`mt-2 mb-6 flex flex-col ${textAlign === 'left' ? 'items-start' : textAlign === 'right' ? 'items-end' : 'items-center'} w-full`} style={{ textAlign: textAlign as any }}>
      <div className="relative inline-block group w-full" style={{ width: width, maxWidth: '100%' }}>
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
        <div className="mt-1 pb-2 w-full flex justify-center text-center mx-auto relative z-10">
          <NodeViewErrorBoundary>
            <RichCaptionInput
              initialContent={caption}
              onChange={(html) => {
                const normalized = normalizeCaption(html)
                lastKnownCaptionRef.current = normalized
                setCaption(normalized)
                // Persist immediately so node remounts/selection changes cannot drop captions.
                safeUpdateAttributes({ title: normalized })
              }}
              onBlur={handleBlur}
              placeholder="Add a caption..."
            />
          </NodeViewErrorBoundary>
        </div>

        {/* Toolbar */}
        {selected && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur shadow-lg rounded-lg border border-gray-200 p-1.5 z-50 whitespace-nowrap min-w-max">

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

            <button
              onClick={removeImageNode}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-red-50 text-red-600"
              title="Remove image"
              type="button"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>

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

  addKeyboardShortcuts() {
    const removeIfSelected = () =>
      this.editor.commands.command(({ state, tr, dispatch }) => {
        const { selection } = state
        if (!(selection instanceof NodeSelection)) return false
        if (selection.node.type.name !== this.name) return false

        if (dispatch) {
          dispatch(tr.deleteSelection().scrollIntoView())
        }

        return true
      })

    return {
      Backspace: removeIfSelected,
      Delete: removeIfSelected,
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  }
})
