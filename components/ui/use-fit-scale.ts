"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Scales a modal panel down (never up) so its natural size always fits the
 * viewport — dialogs then never require scrolling on short screens.
 *
 * Usage: spread `ref` onto the panel and apply `style={fitStyle(scale)}`.
 * The panel must not have a fixed viewport-height cap or its own inner
 * scroll region, so it reports its true content size; this hook measures via
 * offsetWidth/Height, which are unaffected by the transform we apply, so
 * setting the scale never feeds back into the ResizeObserver (no loop).
 */
export function useFitScale<T extends HTMLElement = HTMLDivElement>(margin = 32) {
  const ref = useRef<T>(null)
  const [scale, setScale] = useState(1)

  const recompute = useCallback(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    if (!w || !h) return
    const availW = window.innerWidth - margin
    const availH = window.innerHeight - margin
    setScale(Math.min(1, availW / w, availH / h))
  }, [margin])

  // Measure before paint so there's no flash at full size.
  useLayoutEffect(() => {
    recompute()
  }, [recompute])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(() => recompute())
    observer.observe(el)
    window.addEventListener('resize', recompute)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [recompute])

  return { ref, scale }
}

export function fitStyle(scale: number): React.CSSProperties {
  return { transform: `scale(${scale})`, transformOrigin: 'center center' }
}
