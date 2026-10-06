'use client'

import { useEffect, useState } from 'react'

/**
 * `true` while any Radix `Dialog`/`Sheet` is open — the video lightbox, the
 * mobile nav menu, an auth popup… Every one of them locks
 * `document.body.style.pointerEvents = 'none'` while open (Radix's own modal
 * behaviour), so watching that one attribute detects "some overlay is up"
 * without threading open-state through every dialog in the app. Used by the
 * floating chat button (mục II.3) to get out of the way while one is open.
 */
export function useModalOpen(): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const check = () => setOpen(document.body.style.pointerEvents === 'none')
    check()

    const observer = new MutationObserver(check)
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [])

  return open
}
