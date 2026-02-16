import { NodeViewWrapper } from '@tiptap/react'
import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function ImageSliderComponent(props: any) {
  const images = props.node.attrs.images || []
  const [currentIndex, setCurrentIndex] = useState(0)

  if (!images.length) return <NodeViewWrapper className="image-slider-wrapper p-4 bg-slate-50 rounded border border-slate-200 text-slate-400 text-center text-sm">No images in slider</NodeViewWrapper>

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)

  return (
    <NodeViewWrapper className="image-slider-wrapper relative group rounded-xl overflow-hidden my-6 border border-slate-200 shadow-sm select-none">
      <div className="aspect-video relative bg-slate-100 flex items-center justify-center">
        {/* Current Image */}
        <img 
          src={images[currentIndex]} 
          alt={`Slide ${currentIndex + 1}`}
          className="max-h-full max-w-full object-contain"
        />
        
        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-10"
              type="button"
              title="Previous"
            >
              <ChevronLeft size={20} className="text-slate-700" />
            </button>
            <button 
              onClick={next}
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
                  onClick={() => setCurrentIndex(idx)}
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
      </div>
    </NodeViewWrapper>
  )
}
