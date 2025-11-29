'use client'

import { useMemo, useState, type CSSProperties } from 'react'

type Props = {
  images: string[]
}

export function LessonImageSlider({ images }: Props) {
  const [index, setIndex] = useState(0)
  if (!images.length) return null
  const current = Math.min(index, images.length - 1)
  const goPrev = () => setIndex((prev) => (prev - 1 + images.length) % images.length)
  const goNext = () => setIndex((prev) => (prev + 1) % images.length)

  const activeSrc = images[current]
  const containerStyle = useMemo<CSSProperties>(() => ({
    width: '100%',
    maxWidth: '720px',
  }), [])

  return (
    <div className="space-y-3 flex flex-col items-center">
      <div className="inline-flex max-w-full" style={containerStyle}>
        <div
          className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white flex items-center justify-center"
          style={{ height: '462px' }}
        >
          <img
            src={activeSrc}
            alt="Lesson slide"
            className="block h-full w-full object-contain"
          />
          {images.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow hover:bg-white"
              >
                <span className="text-lg leading-none text-gray-700">‹</span>
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 border border-gray-200 shadow hover:bg-white"
              >
                <span className="text-lg leading-none text-gray-700">›</span>
              </button>
            </>
          ) : null}
        </div>
      </div>
      {images.length > 1 ? (
        <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
          {current + 1} / {images.length}
        </div>
      ) : null}
    </div>
  )
}
