'use client'

import { useMemo, useState, type CSSProperties } from 'react'

type Props = {
  images: string[]
}

export function LessonImageSlider({ images }: Props) {
  const [index, setIndex] = useState(0)
  const [imageSizes, setImageSizes] = useState<Record<string, { width: number; height: number }>>({})
  if (!images.length) return null
  const current = Math.min(index, images.length - 1)
  const goPrev = () => setIndex((prev) => (prev - 1 + images.length) % images.length)
  const goNext = () => setIndex((prev) => (prev + 1) % images.length)

  const activeSrc = images[current]
  const measuredWidth = imageSizes[activeSrc]?.width || 0
  const containerWidth = measuredWidth ? Math.min(measuredWidth, 720) : 720
  const containerStyle = useMemo<CSSProperties>(() => ({
    width: containerWidth,
    maxWidth: '100%',
  }), [containerWidth])

  return (
    <div className="space-y-3 flex flex-col items-center">
      <div className="inline-flex max-w-full" style={containerStyle}>
        <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white flex items-center justify-center">
          <img
            key={`${activeSrc}-${current}`}
            src={activeSrc}
            alt="Lesson slide"
            className="block max-w-full h-auto max-h-[75vh] object-contain"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget
              setImageSizes((prev) => {
                if (prev[activeSrc]?.width === naturalWidth && prev[activeSrc]?.height === naturalHeight) {
                  return prev
                }
                return {
                  ...prev,
                  [activeSrc]: {
                    width: naturalWidth,
                    height: naturalHeight,
                  },
                }
              })
            }}
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
