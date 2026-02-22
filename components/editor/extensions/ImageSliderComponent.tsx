import { NodeViewWrapper } from '@tiptap/react'
import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react'

export default function ImageSliderComponent(props: any) {
  const images = props.node.attrs.images || []
  const [currentIndex, setCurrentIndex] = useState(0)
  const [caption, setCaption] = useState(props.node.attrs.title || '')

  useEffect(() => {
    setCaption(props.node.attrs.title || '')
  }, [props.node.attrs.title])

  const handleBlur = () => {
    if (caption !== props.node.attrs.title) {
       props.updateAttributes({ title: caption })
    }
  }

  if (!images.length) return <NodeViewWrapper className="image-slider-wrapper p-4 bg-slate-50 rounded border border-slate-200 text-slate-400 text-center text-sm">No images in slider</NodeViewWrapper>

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)

  const moveLeft = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentIndex === 0) return
    const newImages = [...images]
    const temp = newImages[currentIndex - 1]
    newImages[currentIndex - 1] = newImages[currentIndex]
    newImages[currentIndex] = temp
    props.updateAttributes({ images: newImages })
    setCurrentIndex(currentIndex - 1)
  }

  const moveRight = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentIndex === images.length - 1) return
    const newImages = [...images]
    const temp = newImages[currentIndex + 1]
    newImages[currentIndex + 1] = newImages[currentIndex]
    newImages[currentIndex] = temp
    props.updateAttributes({ images: newImages })
    setCurrentIndex(currentIndex + 1)
  }

  const removeImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newImages = images.filter((_: any, i: number) => i !== currentIndex)
    if (newImages.length === 0) {
      if (typeof props.deleteNode === 'function') {
        props.deleteNode()
      }
      return
    }
    props.updateAttributes({ images: newImages })
    if (currentIndex >= newImages.length) {
      setCurrentIndex(newImages.length - 1)
    }
  }

  return (
    <NodeViewWrapper className="image-slider-wrapper relative group select-none flex flex-col items-center space-y-3 my-6">
      <div className="inline-flex w-full max-w-[720px]">
        <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white flex items-center justify-center" style={{ height: '462px' }}>
        {/* Current Image */}
        <img 
          src={images[currentIndex]} 
          alt={`Slide ${currentIndex + 1}`}
          className="block h-full w-full object-contain"
        />
        
        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-10"
              type="button"
              title="Previous"
            >
              <ChevronLeft size={20} className="text-slate-700" />
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-10"
              type="button"
              title="Next"
            >
              <ChevronRight size={20} className="text-slate-700" />
            </button>
            
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 p-1 rounded-full bg-black/10 backdrop-blur-[2px]">
              {images.map((_: any, idx: number) => (
                <button 
                  key={idx}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex(idx); }}
                  className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
            
            {/* Counter */}
            <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs text-white font-medium">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}

        {/* Editor Controls */}
        {props.editor?.isEditable && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={moveLeft}
              disabled={currentIndex === 0}
              className="p-1.5 bg-black/50 backdrop-blur-sm rounded text-white hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50 transition-colors"
              title="Move photo left"
              type="button"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={moveRight}
              disabled={currentIndex === images.length - 1}
              className="p-1.5 bg-black/50 backdrop-blur-sm rounded text-white hover:bg-black/70 disabled:opacity-30 disabled:hover:bg-black/50 transition-colors"
              title="Move photo right"
              type="button"
            >
              <ArrowRight size={16} />
            </button>
            <button
              onClick={removeImage}
              className="p-1.5 bg-red-500/80 backdrop-blur-sm rounded text-white hover:bg-red-500 transition-colors ml-2"
              title="Delete photo"
              type="button"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      </div>
      
      {/* Caption Input */}
      <div className="mt-1 w-full flex justify-center max-w-[720px]">
        <input
          type="text"
          className="w-full max-w-sm text-center text-sm text-gray-500 bg-transparent border border-transparent hover:border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded px-2 py-1 outline-none transition-colors placeholder:text-gray-300"
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
    </NodeViewWrapper>
  )
}
