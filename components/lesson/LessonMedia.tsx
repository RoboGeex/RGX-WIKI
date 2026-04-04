'use client'

import { useEffect, useRef, useState } from 'react'
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
  loading = 'lazy',
}: LessonImageProps) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const reserveClass = minHeightClassName || 'min-h-[12rem]'

  useEffect(() => {
    setLoaded(false)
  }, [src])

  useEffect(() => {
    const el = imgRef.current
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true)
      return
    }
    return
  }, [src])

  const image = (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      loading={loading}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
      className={`${imgClassName} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
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
