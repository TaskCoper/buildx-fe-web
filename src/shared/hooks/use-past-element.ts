'use client'

import { useEffect, useState } from 'react'

/**
 * `true` once the page has scrolled past the bottom of the element with this
 * `id` (e.g. the hero) — `false` while it's still on screen. A route with no
 * such element reads as "already past" so callers land on their settled look
 * (opaque header, visible chat FAB…) instead of staying in the "before" state
 * forever. Pass `enabled = false` while the observed element is waiting on
 * async data so the hook stays in its initial, non-sticky state.
 */
export function usePastElement(id: string, enabled = true): boolean {
  const [past, setPast] = useState(false)

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- disabled observers must return to their initial, non-sticky state
      setPast(false)
      return
    }

    const el = document.getElementById(id)
    if (!el) {
      setPast(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0)
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [enabled, id])

  return past
}
