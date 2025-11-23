'use client'

import { useState } from 'react'

type Props = {
  images: string[]
}

export function LessonImageSlider({ images }: Props) {
  const [index, setIndex] = useState(0)
  if (!images.length) return null
  const current = Math.min(index, images.length - 1)
  const goPrev = () => setIndex((prev) => (prev - 1 + images.length) % images.length)
  const goNext = () => setIndex((prev) => (prev + 1) % images.length)

  return (
    <div className="space-y-4">
      <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <img
          src={images[current]}
          alt="Lesson slide"
          className="w-full h-auto object-contain"
        />
      </div>
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <- Prev
          </button>
          <div className="text-xs text-gray-500">
            {current + 1} / {images.length}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            Next ->
          </button>
        </div>
      )}
    </div>
  )
}
