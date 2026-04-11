'use client'

import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ZoomableImage } from '@/components/zoomable-image'

type BaseProps = {
  className?: string
  minHeightClassName?: string
}

type LessonImageProps = BaseProps & {
  src: string
  alt?: string
  imgClassName?: string
  zoomable?: boolean
  trimWhitespace?: boolean
  loading?: 'eager' | 'lazy'
}

type LessonEmbedProps = BaseProps & {
  src: string
  title: string
  allow?: string
  allowFullScreen?: boolean
  iframeClassName?: string
  loading?: 'eager' | 'lazy'
}

type LessonVideoProps = BaseProps & {
  src: string
  poster?: string
  videoClassName?: string
  controls?: boolean
  preload?: 'none' | 'metadata' | 'auto'
}

function MediaSkeleton({ show, minHeightClassName = 'min-h-[12rem]' }: { show: boolean; minHeightClassName?: string }) {
  if (!show) return null
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 z-10 animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 ${minHeightClassName}`}
    />
  )
}

export function LessonImage({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  minHeightClassName,
  zoomable = false,
  trimWhitespace = false,
  loading = 'lazy',
}: LessonImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [trimStyle, setTrimStyle] = useState<CSSProperties | undefined>(undefined)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const reserveClass = minHeightClassName || 'min-h-[12rem]'

  const detectWhitespaceTrim = useCallback(() => {
    if (!trimWhitespace) {
      setTrimStyle(undefined)
      return
    }

    const imageEl = imgRef.current
    if (!imageEl || !imageEl.complete) return

    const naturalWidth = imageEl.naturalWidth
    const naturalHeight = imageEl.naturalHeight
    if (!naturalWidth || !naturalHeight) return

    try {
      const sampleTarget = 512
      const downscale = Math.max(1, Math.ceil(Math.max(naturalWidth, naturalHeight) / sampleTarget))
      const sampleWidth = Math.max(1, Math.floor(naturalWidth / downscale))
      const sampleHeight = Math.max(1, Math.floor(naturalHeight / downscale))

      const canvas = document.createElement('canvas')
      canvas.width = sampleWidth
      canvas.height = sampleHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      ctx.drawImage(imageEl, 0, 0, sampleWidth, sampleHeight)
      const { data } = ctx.getImageData(0, 0, sampleWidth, sampleHeight)

      let minX = sampleWidth
      let minY = sampleHeight
      let maxX = -1
      let maxY = -1

      // Detect visible content by alpha to trim transparent canvas padding safely.
      for (let y = 0; y < sampleHeight; y += 1) {
        for (let x = 0; x < sampleWidth; x += 1) {
          const idx = (y * sampleWidth + x) * 4
          const alpha = data[idx + 3]
          if (alpha > 10) {
            if (x < minX) minX = x
            if (y < minY) minY = y
            if (x > maxX) maxX = x
            if (y > maxY) maxY = y
          }
        }
      }

      if (maxX < 0 || maxY < 0) {
        setTrimStyle(undefined)
        return
      }

      const left = minX / sampleWidth
      const right = (sampleWidth - 1 - maxX) / sampleWidth
      const top = minY / sampleHeight
      const bottom = (sampleHeight - 1 - maxY) / sampleHeight

      const horizontalTrim = left + right
      const verticalTrim = top + bottom
      const minTrimThreshold = 0.08

      if (horizontalTrim < minTrimThreshold && verticalTrim < minTrimThreshold) {
        setTrimStyle(undefined)
        return
      }

      const safeHorizontal = Math.min(horizontalTrim, 0.92)
      const safeVertical = Math.min(verticalTrim, 0.92)
      const scaleX = 1 / Math.max(0.08, 1 - safeHorizontal)
      const scaleY = 1 / Math.max(0.08, 1 - safeVertical)
      const scale = Math.min(3, Math.max(scaleX, scaleY))

      setTrimStyle({
        clipPath: `inset(${(top * 100).toFixed(2)}% ${(right * 100).toFixed(2)}% ${(bottom * 100).toFixed(2)}% ${(left * 100).toFixed(2)}%)`,
        transform: `scale(${scale.toFixed(3)})`,
        transformOrigin: 'center center',
      })
    } catch {
      // Cross-origin images can taint canvas; skip auto-trim in that case.
      setTrimStyle(undefined)
    }
  }, [trimWhitespace])

  useEffect(() => {
    setLoaded(false)
    setTrimStyle(undefined)
  }, [src])

  useEffect(() => {
    const el = imgRef.current
    if (el && el.complete) {
      setLoaded(true)
      detectWhitespaceTrim()
      return
    }
    return
  }, [src, detectWhitespaceTrim])

  const image = (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading={loading}
      onLoad={() => {
        setLoaded(true)
        detectWhitespaceTrim()
      }}
      onError={() => setLoaded(true)}
      className={`${imgClassName} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      style={trimStyle}
    />
  )

  return (
    <div className={`relative w-full ${!loaded ? reserveClass : ''} ${className}`}>
      <MediaSkeleton show={!loaded} minHeightClassName={reserveClass} />
      {zoomable ? <ZoomableImage className="w-full h-full">{image}</ZoomableImage> : image}
    </div>
  )
}

export function LessonEmbed({
  src,
  title,
  className = '',
  iframeClassName = '',
  minHeightClassName,
  allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
  allowFullScreen = true,
  loading = 'lazy',
}: LessonEmbedProps) {
  const [loaded, setLoaded] = useState(false)
  const reserveClass = minHeightClassName || 'min-h-[12rem]'

  useEffect(() => {
    setLoaded(false)
  }, [src])

  return (
    <div className={`relative h-full w-full ${!loaded ? reserveClass : ''} ${className}`}>
      <MediaSkeleton show={!loaded} minHeightClassName={reserveClass} />
      <iframe
        src={src}
        title={title}
        allow={allow}
        allowFullScreen={allowFullScreen}
        loading={loading}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full block ${iframeClassName} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

export function LessonVideo({
  src,
  poster,
  className = '',
  videoClassName = '',
  minHeightClassName,
  controls = true,
  preload = 'metadata',
}: LessonVideoProps) {
  const [loaded, setLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const reserveClass = minHeightClassName || 'min-h-[12rem]'

  useEffect(() => {
    setLoaded(false)
  }, [src])

  useEffect(() => {
    const el = videoRef.current
    if (el && el.readyState >= 2) {
      setLoaded(true)
      return
    }
    return
  }, [src, poster])

  return (
    <div className={`relative w-full ${!loaded ? reserveClass : ''} ${className}`}>
      <MediaSkeleton show={!loaded} minHeightClassName={reserveClass} />
      <video
        ref={videoRef}
        controls={controls}
        src={src}
        poster={poster || undefined}
        preload={preload}
        onLoadedData={() => setLoaded(true)}
        onCanPlay={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`${videoClassName} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
