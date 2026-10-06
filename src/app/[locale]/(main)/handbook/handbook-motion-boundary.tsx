'use client'

import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const EXIT_DURATION_MS = 145
const PROGRESS_DELAY_MS = 170
const PROGRESS_FINISH_MS = 220

/**
 * Route-level motion only for Cẩm nang.
 *
 * The boundary wraps page content, not the public header / AI dock, so chrome
 * stays fixed while handbook pages leave/enter. Card -> detail owns its own
 * shared-element View Transition and opts out here to avoid double animation.
 */
export function HandbookMotionBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement>(null)
  const exitAnimationRef = useRef<Animation | null>(null)
  const progressDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressFinishRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const asyncWaitCleanupRef = useRef<(() => void) | null>(null)
  const navigationTokenRef = useRef(0)
  const [progressState, setProgressState] = useState<'hidden' | 'running' | 'finishing'>('hidden')

  const clearProgressTimers = useCallback(() => {
    if (progressDelayRef.current) clearTimeout(progressDelayRef.current)
    if (progressFinishRef.current) clearTimeout(progressFinishRef.current)
    progressDelayRef.current = null
    progressFinishRef.current = null
  }, [])

  const startProgress = useCallback(() => {
    clearProgressTimers()
    setProgressState('hidden')
    progressDelayRef.current = setTimeout(() => {
      progressDelayRef.current = null
      setProgressState('running')
    }, PROGRESS_DELAY_MS)
  }, [clearProgressTimers])

  const finishProgress = useCallback(() => {
    if (progressDelayRef.current) {
      clearTimeout(progressDelayRef.current)
      progressDelayRef.current = null
      setProgressState('hidden')
      return
    }
    setProgressState((current) => (current === 'running' ? 'finishing' : 'hidden'))
    progressFinishRef.current = setTimeout(() => {
      progressFinishRef.current = null
      setProgressState('hidden')
    }, PROGRESS_FINISH_MS)
  }, [])

  const waitForAsyncContent = useCallback(() => {
    asyncWaitCleanupRef.current?.()
    asyncWaitCleanupRef.current = null

    const root = contentRef.current
    if (!root) {
      finishProgress()
      return
    }

    const isLoading = () => Boolean(root.querySelector('[data-handbook-loading="true"]'))
    if (!isLoading()) {
      finishProgress()
      return
    }

    let settled = false
    let guardTimer: ReturnType<typeof setTimeout> | null = null
    const observer = new MutationObserver(() => settle())
    const cleanup = () => {
      observer.disconnect()
      if (guardTimer) clearTimeout(guardTimer)
      guardTimer = null
      if (asyncWaitCleanupRef.current === cleanup) asyncWaitCleanupRef.current = null
    }
    const settle = () => {
      if (settled || isLoading()) return
      settled = true
      cleanup()
      finishProgress()
    }
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-handbook-loading']
    })

    // A failed request still swaps the skeleton for an ErrorState. This guard
    // prevents a stale observer from surviving a future navigation.
    guardTimer = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      finishProgress()
    }, 12_000)
    asyncWaitCleanupRef.current = cleanup
  }, [finishProgress])

  useEffect(() => {
    exitAnimationRef.current?.cancel()
    exitAnimationRef.current = null
    const node = contentRef.current
    node?.style.removeProperty('opacity')
    node?.style.removeProperty('transform')
    node?.style.removeProperty('pointer-events')
    const frame = requestAnimationFrame(waitForAsyncContent)
    return () => cancelAnimationFrame(frame)
  }, [pathname, waitForAsyncContent])

  useEffect(
    () => () => {
      clearProgressTimers()
      asyncWaitCleanupRef.current?.()
      asyncWaitCleanupRef.current = null
      exitAnimationRef.current?.cancel()
    },
    [clearProgressTimers]
  )

  const runLeave = useCallback(
    (navigate: () => void) => {
      const node = contentRef.current
      const token = ++navigationTokenRef.current
      startProgress()

      if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        navigate()
        return
      }

      exitAnimationRef.current?.cancel()
      node.style.pointerEvents = 'none'
      const animation = node.animate(
        [
          { opacity: 1, transform: 'translate3d(0,0,0)' },
          { opacity: 0.72, transform: 'translate3d(0,-6px,0)' }
        ],
        { duration: EXIT_DURATION_MS, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'both' }
      )
      exitAnimationRef.current = animation
      void animation.finished
        .catch(() => undefined)
        .then(() => {
          if (navigationTokenRef.current !== token) return
          navigate()
        })
    },
    [startProgress]
  )

  const leaveTo = useCallback(
    (href: string) => {
      runLeave(() => router.push(href as Route))
    },
    [router, runLeave]
  )

  useEffect(() => {
    const onNavigationStart = () => startProgress()
    const onBackRequest = () => runLeave(() => router.back())
    window.addEventListener('savico:handbook-navigation-start', onNavigationStart)
    window.addEventListener('savico:handbook-back-request', onBackRequest)
    return () => {
      window.removeEventListener('savico:handbook-navigation-start', onNavigationStart)
      window.removeEventListener('savico:handbook-back-request', onBackRequest)
    }
  }, [router, runLeave, startProgress])

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      if (anchor.closest('[data-template-card-open]')) return
      if (anchor.dataset.handbookTransitionBypass !== undefined) return

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return

      event.preventDefault()
      leaveTo(`${url.pathname}${url.search}${url.hash}`)
    }

    document.addEventListener('click', onDocumentClick, true)
    return () => document.removeEventListener('click', onDocumentClick, true)
  }, [leaveTo])

  return (
    <>
      <div
        data-handbook-progress={progressState}
        aria-hidden='true'
        className='pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden'
      >
        <span className='bg-primary block h-full origin-left' />
      </div>
      <div ref={contentRef} data-handbook-route-content>
        {children}
      </div>
    </>
  )
}
