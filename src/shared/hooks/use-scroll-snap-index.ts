'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Tracks which direct child of a horizontally-scrollable, scroll-snap
 * container is currently centered — the dot indicator under a mobile
 * carousel (mục II.2: dải 5 thẻ vấn đề, dải hồ sơ mẫu). `scrollTo(index)`
 * drives the dots back onto the strip; `ref` goes on the scroll container.
 */
export function useScrollSnapIndex<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onScroll = () => {
      const children = Array.from(el.children) as HTMLElement[]
      if (children.length === 0) return
      const center = el.scrollLeft + el.clientWidth / 2

      let closest = 0
      let closestDistance = Infinity
      children.forEach((child, index) => {
        const distance = Math.abs(child.offsetLeft + child.clientWidth / 2 - center)
        if (distance < closestDistance) {
          closestDistance = distance
          closest = index
        }
      })
      setActive(closest)
    }

    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (index: number) => {
    const child = ref.current?.children[index]
    if (child instanceof HTMLElement) child.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  return { ref, active, scrollTo }
}
