'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * `true` while the page is actively scrolling, `false` again `idleMs` after
 * the last scroll event. Used to pause idle-only ambient animations (the
 * assistant FAB's "breathing" pulse — mục 11 trang Tư vấn 1:1) while the
 * visitor is mid-scroll.
 */
export function useIsScrolling(idleMs = 150): boolean {
  const [scrolling, setScrolling] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const onScroll = () => {
      setScrolling(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setScrolling(false), idleMs)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timer.current)
    }
  }, [idleMs])

  return scrolling
}
