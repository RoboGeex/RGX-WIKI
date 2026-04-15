'use client'

import { useState } from 'react'
import { LessonImage } from '@/components/lesson/LessonMedia'

type Props = {
  images: any[]
  layoutMode?: string
}

export function LessonImageSlider({ images, layoutMode = 'fit' }: Props) {
  const [index, setIndex] = useState(0)
  if (!images.length) return null
  const current = Math.min(index, images.length - 1)
  const goPrev = () => setIndex((prev) => (prev - 1 + images.length) % images.length)
  const goNext = () => setIndex((prev) => (prev + 1) % images.length)

  const activeItem = images[current]
  const activeSrc = typeof activeItem === 'string' ? activeItem : activeItem?.url
  const activeCaption = typeof activeItem === 'string' ? '' : (activeItem?.caption || '')

  if (!activeSrc) return null

  return (
    <div className="space-y-1 flex flex-col items-center w-full">
      <div className="w-full max-w-[720px] mx-auto">
        <div
          className={`relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-md ${
            layoutMode === '1:1' ? 'aspect-square' :
            layoutMode === '3:4' ? 'aspect-[3/4]' :
            layoutMode === '2:3' ? 'aspect-[2/3]' :
            layoutMode === '16:9' ? 'aspect-video' : ''
          }`}
          style={(!layoutMode || layoutMode === 'fit') ? { display: 'grid', gridTemplateAreas: '"stack"', fontSize: 0, lineHeight: 0 } : {}}
        >
          {/* All images stacked in the same grid cell — the tallest/widest one sizes the container */}
          {images.map((item, i) => {
            const src = typeof item === 'string' ? item : item?.url
            const cap = typeof item === 'string' ? '' : (item?.caption || '')
            const isActive = i === current

            return (
              <div
                key={i}
                style={(!layoutMode || layoutMode === 'fit') ? { gridArea: 'stack' } : {}}
                className={`w-full flex items-center justify-center ${isActive ? 'visible opacity-100 z-10' : 'invisible opacity-0 pointer-events-none z-0'} ${
                  (layoutMode === '1:1' || layoutMode === '3:4' || layoutMode === '2:3' || layoutMode === '16:9') ? 'absolute inset-0 h-full' : ''
                }`}
                aria-hidden={!isActive}
              >
                {isActive ? (
                  <LessonImage
                    src={src}
                    alt={cap || "Lesson slide"}
                    zoomable
                    trimWhitespace={!layoutMode || layoutMode === 'fit'}
                    minHeightClassName={(!layoutMode || layoutMode === 'fit') ? 'min-h-[14rem]' : undefined}
                    imgClassName={`block w-full !m-0 !p-0 ${
                      (layoutMode === '1:1' || layoutMode === '3:4' || layoutMode === '2:3' || layoutMode === '16:9') ? 'h-full object-cover' : 'h-auto object-cover'
                    }`}
                  />
                ) : (
                  <img
                    src={src}
                    alt=""
                    className={`block w-full !m-0 !p-0 ${
                      (layoutMode === '1:1' || layoutMode === '3:4' || layoutMode === '2:3' || layoutMode === '16:9') ? 'h-full object-cover' : 'h-auto object-cover'
                    }`}
                  />
                )}
              </div>
            )
          })}

          {images.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary border border-white/20 shadow-lg hover:bg-primary/90 transition-all active:scale-95 z-20 group/btn"
              >
                <span className="text-2xl leading-none text-white font-bold transition-transform group-hover/btn:-translate-x-0.5">‹</span>
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary border border-white/20 shadow-lg hover:bg-primary/90 transition-all active:scale-95 z-20 group/btn"
              >
                <span className="text-2xl leading-none text-white font-bold transition-transform group-hover/btn:translate-x-0.5">›</span>
              </button>
            </>
          ) : null}

          {/* Dots */}
          {images.length > 1 ? (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              {images.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIndex(idx); }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === current ? 'bg-primary ring-2 ring-white/50 scale-125' : 'bg-white/40 hover:bg-white/70'}`}
                  type="button"
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Active caption displayed as a standard figure caption */}
      {activeCaption ? (
        <figcaption
          className="mt-1 w-full text-base text-gray-600 text-center [&_p]:m-0 [&_p]:!text-base [&_p]:!text-gray-600 [&_p]:!leading-tight"
          dangerouslySetInnerHTML={{ __html: activeCaption }}
        />
      ) : null}
    </div>
  )
}
