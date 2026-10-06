'use client'

import { useEffect, useRef, useState } from 'react'

export type ScrollDirection = 'up' | 'down'

/**
 * `'down'` once the page has scrolled down past `threshold`, `'up'` again as
 * soon as it scrolls back — small jitters under `minDelta` are ignored so a
 * shaky trackpad doesn't flicker the result. Used by the site header to
 * shrink on the way down and expand on the way back up without ever fully
 * hiding (mục II.1).
 */
export function useScrollDirection(threshold = 80, minDelta = 6): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>('up')
  const lastY = useRef(0)

  useEffect(() => {
    lastY.current = window.scrollY
    let frame = 0

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const y = window.scrollY
        const delta = y - lastY.current
        if (y <= threshold) setDirection('up')
        else if (Math.abs(delta) >= minDelta) setDirection(delta > 0 ? 'down' : 'up')
        lastY.current = y
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [threshold, minDelta])

  return direction
}
