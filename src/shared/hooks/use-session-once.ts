'use client'

import { useEffect, useState } from 'react'

/**
 * Tracks a "played already this tab session" flag in `sessionStorage`. First
 * mount of a fresh session returns `false` (play the intro), and immediately
 * marks the key so any later mount within the same session — navigating away
 * and back to `/` — returns `true` and skips straight to the finished state.
 *
 * Starts `false` on both server and client so hydration never mismatches;
 * the flip to `true` (when already seen) happens a tick later in an effect,
 * same trade-off `useScrolled` already makes for scroll-derived state.
 */
export function useSessionOnce(key: string): boolean {
  const [seenBefore, setSeenBefore] = useState(false)

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(key) === '1') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of a value that can't change during this mount, not a subscription
        setSeenBefore(true)
      } else {
        window.sessionStorage.setItem(key, '1')
      }
    } catch {
      // Private mode / storage disabled — just let the intro play every time.
    }
  }, [key])

  return seenBefore
}
