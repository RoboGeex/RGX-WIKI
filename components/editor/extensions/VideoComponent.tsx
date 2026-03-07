import { NodeViewWrapper } from '@tiptap/react'
import React, { useState, useEffect, useRef } from 'react'
import { AlignLeft, AlignCenter, AlignRight, Maximize, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { RichCaptionInput } from './RichCaptionInput'
import { NodeViewErrorBoundary } from './NodeViewErrorBoundary'

export default function VideoComponent(props: any) {
  const { node, updateAttributes, selected, deleteNode, editor } = props
  const isVimeo = typeof node.attrs.src === 'string' && node.attrs.src.includes('vimeo.com')
  const isYoutube = typeof node.attrs.src === 'string' && (node.attrs.src.includes('youtube.com') || node.attrs.src.includes('youtu.be'))
  const provider = node.attrs.provider || (isVimeo ? 'vimeo' : isYoutube ? 'youtube' : null)

  const getEmbedUrl = (url: string) => {
    if (!url) return ''
    if (url.includes('vimeo.com') && !url.includes('player.vimeo.com')) {
      const match = url.match(/vimeo\.com\/(?:video\/)*([0-9]+)/)
      return match ? `https://player.vimeo.com/video/${match[1]}` : url
    }
    if ((url.includes('youtube.com') || url.includes('youtu.be')) && !url.includes('youtube.com/embed')) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/)
      return match ? `https://www.youtube.com/embed/${match[1]}` : url
    }
    return url
  }

  const [caption, setCaption] = useState(node.attrs.title || '')
  const [width, setWidth] = useState(node.attrs.width || '100%')
  const [textAlign, setTextAlign] = useState(node.attrs.textAlign || 'center') // left | center | right
  const [layoutMode, setLayoutMode] = useState(node.attrs.layoutMode || 'fit') // fit | 1:1 | 16:9
  const [showReplaceUrl, setShowReplaceUrl] = useState(false)
  const [replaceUrlValue, setReplaceUrlValue] = useState('')
  const [isReplacing, setIsReplacing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setCaption(node.attrs.title || '')
    setWidth(node.attrs.width || '100%')
    setTextAlign(node.attrs.textAlign || 'center')
    setLayoutMode(node.attrs.layoutMode || 'fit')
  }, [node.attrs.title, node.attrs.width, node.attrs.textAlign, node.attrs.layoutMode])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
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

  const handleReplaceUrl = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const url = replaceUrlValue.trim()
      if (!url) return
      const isVimeoNew = url.includes('vimeo.com')
      const isYoutubeNew = url.includes('youtube.com') || url.includes('youtu.be')
      const newProvider = isVimeoNew ? 'vimeo' : isYoutubeNew ? 'youtube' : null
      updateAttributes({ src: url, provider: newProvider })
      setReplaceUrlValue('')
      setShowReplaceUrl(false)
    } else if (e.key === 'Escape') {
      setShowReplaceUrl(false)
      setReplaceUrlValue('')
    }
  }

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsReplacing(true)

    const urlParams = new URLSearchParams(window.location.search)
    const wikiSlug = urlParams.get('wiki') ?? undefined

    let videoUrl: string | undefined
    let videoProvider: string | null = null

    try {
      // Step 1: Ask server for a Vimeo upload slot (tiny JSON — no video bytes through Vercel)
      const createRes = await fetch('/api/vimeo/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, size: file.size, wikiSlug }),
      }).catch(() => null)

      if (createRes && createRes.ok) {
        const { uploadLink, playbackUrl } = await createRes.json()
        if (uploadLink && playbackUrl) {
          // Step 2: Upload directly from browser to Vimeo via TUS (bypasses Vercel entirely)
          const tus = await import('tus-js-client')
          await new Promise<void>((resolve, reject) => {
            const upload = new tus.Upload(file, {
              uploadUrl: uploadLink,
              retryDelays: [0, 3000, 5000, 10000, 20000],
              onError: (err) => reject(err),
              onSuccess: () => resolve(),
            })
            upload.start()
          })
          videoUrl = playbackUrl
          videoProvider = 'vimeo'
        }
      }

      // Step 3: Fallback — only if Vimeo isn't configured (routes through /api/upload)
      if (!videoUrl) {
        const fd = new FormData()
        fd.append('file', file)
        if (wikiSlug) fd.append('wikiSlug', wikiSlug)
        fd.append('mediaType', 'video')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        videoUrl = data.url
        videoProvider = data.provider || null
      }

      updateAttributes({ src: videoUrl, provider: videoProvider })

      if (videoProvider === 'vimeo') {
        alert('Video replaced. It may take a moment for Vimeo to finish processing before playback works.')
      }
    } catch (err: any) {
      alert('Failed to replace video: ' + (err?.message || 'unknown error'))
    } finally {
      setIsReplacing(false)
      e.target.value = ''
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = containerRef.current?.offsetWidth || 0

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
    <NodeViewWrapper className={`mt-2 mb-6 flex flex-col items-${textAlign === 'left' ? 'start' : textAlign === 'right' ? 'end' : 'center'} w-full relative`} style={{ textAlign: textAlign as any }}>
      <div className="relative inline-block group w-full" style={{ width: width, maxWidth: '100%' }}>
        {/* Embed: YouTube or Vimeo */}
        {provider === 'vimeo' || provider === 'youtube' ? (
          <div ref={containerRef} className={`relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-black shadow-md ${selected ? 'ring-2 ring-primary' : ''} ${
            layoutMode === '1:1' ? 'aspect-square' :
            layoutMode === '3:4' ? 'aspect-[3/4]' :
            layoutMode === '2:3' ? 'aspect-[2/3]' :
            layoutMode === '16:9' ? 'aspect-video' :
            layoutMode === 'fit' ? '' :
            'aspect-video'
          }`}>
            <iframe
              src={getEmbedUrl(node.attrs.src)}
              title={node.attrs.title || (provider === 'youtube' ? 'YouTube video' : 'Vimeo video')}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full block object-cover"
            />
            {/* Editor Controls */}
            {editor?.isEditable && (
              <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div ref={containerRef} className={`relative w-full rounded-3xl border border-gray-200 shadow-md overflow-hidden bg-black flex items-center justify-center ${selected ? 'ring-2 ring-primary' : ''} ${
            layoutMode === '1:1' ? 'aspect-square' :
            layoutMode === '3:4' ? 'aspect-[3/4]' :
            layoutMode === '2:3' ? 'aspect-[2/3]' :
            layoutMode === '16:9' ? 'aspect-video' :
            layoutMode === 'fit' ? '' :
            'aspect-video'
          }`}>
            <video
              controls
              src={node.attrs.src}
              poster={node.attrs.poster || undefined}
              className={`w-full block object-cover ${layoutMode === 'fit' ? 'h-auto' : 'h-full'}`}
              style={{ display: 'block' }}
            />
            {/* Editor Controls */}
            {editor?.isEditable && (
              <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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

            {/* Replace — URL input for embeds, file upload for native videos */}
            {provider ? (
              showReplaceUrl ? (
                <input
                  autoFocus
                  type="text"
                  value={replaceUrlValue}
                  onChange={(e) => setReplaceUrlValue(e.target.value)}
                  onKeyDown={handleReplaceUrl}
                  onBlur={() => { setShowReplaceUrl(false); setReplaceUrlValue('') }}
                  placeholder="Paste new URL, press Enter"
                  className="text-xs px-2 py-1 border border-gray-300 rounded outline-none focus:border-primary w-52"
                />
              ) : (
                <button
                  onClick={() => setShowReplaceUrl(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-gray-100 text-gray-600"
                  title="Replace video URL"
                  type="button"
                >
                  <RefreshCw size={14} />
                  <span>Replace</span>
                </button>
              )
            ) : (
              <label
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded cursor-pointer hover:bg-gray-100 text-gray-600 ${isReplacing ? 'opacity-50 pointer-events-none' : ''}`}
                title="Replace video file"
              >
                {isReplacing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                <span>Replace</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleReplaceFile} disabled={isReplacing} />
              </label>
            )}

          </div>
        )}

        {/* Caption Input */}
        <div className="mt-1 pb-2 w-full flex justify-center text-center mx-auto relative z-10">
          <NodeViewErrorBoundary>
            <RichCaptionInput
              initialContent={caption}
              onChange={(html) => {
                setCaption(html)
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
                debounceTimerRef.current = setTimeout(() => {
                  updateAttributes({ title: html })
                }, 1000)
              }}
              onBlur={handleBlur}
              placeholder="Add a caption..."
            />
          </NodeViewErrorBoundary>
        </div>
      </div>
    </NodeViewWrapper>
  )
}
