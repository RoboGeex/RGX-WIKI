'use client'

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'

interface InteractiveHtmlProps {
  html: string
  className?: string
  style?: React.CSSProperties
}

export function InteractiveHtml({ html, className = '', style }: InteractiveHtmlProps) {
  const [open, setOpen] = useState(false)
  const [activeImage, setActiveImage] = useState<{ src: string; alt: string }>({ src: '', alt: '' })
  const containerRef = useRef<HTMLDivElement>(null)

  const htmlWithMediaSkeleton = useMemo(() => {
    const addClasses = (source: string, tag: 'img' | 'iframe' | 'video') => {
      const tagRegex = new RegExp(`<${tag}\\b[^>]*>`, 'gi')
      return source.replace(tagRegex, (match) => {
        const hasClass = /\bclass\s*=/.test(match)
        if (hasClass) {
          return match.replace(
            /\bclass\s*=\s*(['"])(.*?)\1/i,
            (_full, quote: string, value: string) =>
              `class=${quote}${value} lesson-inline-media lesson-inline-media-loading${quote}`
          )
        }
        return match.replace(`<${tag}`, `<${tag} class="lesson-inline-media lesson-inline-media-loading"`)
      })
    }

    let output = html || ''
    output = addClasses(output, 'img')
    output = addClasses(output, 'iframe')
    output = addClasses(output, 'video')
    return output
  }, [html])

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    const imageEl = target?.closest('img')
    if (!imageEl) return

    const src = imageEl.getAttribute('src') || ''
    if (!src) return

    event.preventDefault()
    event.stopPropagation()
    setActiveImage({
      src,
      alt: imageEl.getAttribute('alt') || '',
    })
    setOpen(true)
  }

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const cleanups: Array<() => void> = []
    const markLoaded = (el: Element) => el.classList.remove('lesson-inline-media-loading')
    const markLoading = (el: Element) => el.classList.add('lesson-inline-media-loading')
    const baseClass = 'lesson-inline-media'
    const applyAspectRatioVar = (el: HTMLElement, fallback: string) => {
      const styleAttr = el.getAttribute('style') || ''
      const aspectFromStyle = styleAttr.match(/aspect-ratio\s*:\s*([^;]+)/i)?.[1]?.trim()
      if (aspectFromStyle) {
        el.style.setProperty('--lesson-inline-ar', aspectFromStyle.replace(':', ' / '))
        return
      }

      const layoutMode = el.getAttribute('data-layout-mode') || ''
      if (layoutMode === '1:1') {
        el.style.setProperty('--lesson-inline-ar', '1 / 1')
        return
      }
      if (layoutMode === '3:4') {
        el.style.setProperty('--lesson-inline-ar', '3 / 4')
        return
      }
      if (layoutMode === '2:3') {
        el.style.setProperty('--lesson-inline-ar', '2 / 3')
        return
      }
      if (layoutMode === '16:9') {
        el.style.setProperty('--lesson-inline-ar', '16 / 9')
        return
      }

      const parentClass = el.parentElement?.className || ''
      if (/\baspect-square\b/.test(parentClass)) {
        el.style.setProperty('--lesson-inline-ar', '1 / 1')
        return
      }
      if (/\baspect-\[3\/4\]\b/.test(parentClass)) {
        el.style.setProperty('--lesson-inline-ar', '3 / 4')
        return
      }
      if (/\baspect-\[2\/3\]\b/.test(parentClass)) {
        el.style.setProperty('--lesson-inline-ar', '2 / 3')
        return
      }
      if (/\baspect-video\b/.test(parentClass)) {
        el.style.setProperty('--lesson-inline-ar', '16 / 9')
        return
      }

      const widthAttr = Number.parseFloat(el.getAttribute('width') || '')
      const heightAttr = Number.parseFloat(el.getAttribute('height') || '')
      if (Number.isFinite(widthAttr) && Number.isFinite(heightAttr) && widthAttr > 0 && heightAttr > 0) {
        el.style.setProperty('--lesson-inline-ar', `${widthAttr} / ${heightAttr}`)
        return
      }
      el.style.setProperty('--lesson-inline-ar', fallback)
    }

    const images = Array.from(container.querySelectorAll('img'))
    images.forEach((img) => {
      img.classList.add(baseClass)
      applyAspectRatioVar(img as HTMLElement, '4 / 3')
      markLoading(img)
      const imageEl = img as HTMLImageElement
      if (imageEl.complete && imageEl.naturalWidth > 0) {
        markLoaded(img)
        return
      }
      const onDone = () => markLoaded(img)
      imageEl.addEventListener('load', onDone)
      imageEl.addEventListener('error', onDone)
      cleanups.push(() => {
        imageEl.removeEventListener('load', onDone)
        imageEl.removeEventListener('error', onDone)
      })
    })

    const iframes = Array.from(container.querySelectorAll('iframe'))
    iframes.forEach((iframe) => {
      iframe.classList.add(baseClass)
      applyAspectRatioVar(iframe as HTMLElement, '16 / 9')
      markLoading(iframe)
      const frameEl = iframe as HTMLIFrameElement
      const onDone = () => markLoaded(iframe)
      frameEl.addEventListener('load', onDone)
      cleanups.push(() => {
        frameEl.removeEventListener('load', onDone)
      })
    })

    const videos = Array.from(container.querySelectorAll('video'))
    videos.forEach((video) => {
      video.classList.add(baseClass)
      applyAspectRatioVar(video as HTMLElement, '16 / 9')
      markLoading(video)
      const videoEl = video as HTMLVideoElement
      const onDone = () => markLoaded(video)
      videoEl.addEventListener('loadeddata', onDone)
      videoEl.addEventListener('canplay', onDone)
      videoEl.addEventListener('error', onDone)
      cleanups.push(() => {
        videoEl.removeEventListener('loadeddata', onDone)
        videoEl.removeEventListener('canplay', onDone)
        videoEl.removeEventListener('error', onDone)
      })
    })

    return () => cleanups.forEach((fn) => fn())
  }, [htmlWithMediaSkeleton])

  return (
    <>
      <div
        ref={containerRef}
        className={`${className} [&_img]:cursor-zoom-in`}
        style={style}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: htmlWithMediaSkeleton }}
      />

      {activeImage.src ? (
        <Lightbox
          open={open}
          close={() => setOpen(false)}
          slides={[activeImage]}
          plugins={[Zoom]}
          zoom={{ scrollToZoom: true, maxZoomPixelRatio: 5 }}
          carousel={{ finite: true }}
          controller={{ closeOnBackdropClick: true }}
          render={{
            buttonPrev: () => null,
            buttonNext: () => null,
          }}
        />
      ) : null}
    </>
  )
}
