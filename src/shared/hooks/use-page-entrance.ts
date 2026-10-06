'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

const playedEntrances = new Set<string>()
const SESSION_PREFIX = 'savico.page-entrance.'

type EntrancePhase = 'idle' | 'play' | 'done'

interface EntranceLifecycle {
  key: string
  phase: EntrancePhase
}

interface UsePageEntranceOptions {
  /** Delay starting point for this page-local sequence. */
  offsetMs?: number
  /** Wait until async page content exists before starting the opening sequence. */
  enabled?: boolean
  /**
   * Replay whenever this component mounts, even if the same entrance key was
   * already seen earlier in the browser session. Use this for forward flow
   * screens where clicking "Continue" should visibly enter the next screen;
   * leave it off for ordinary Back/revisit behaviour.
   */
  replayOnMount?: boolean
  /** Maximum time before releasing CSS animation ownership back to baseline UI. */
  settleAfterMs?: number
}

function initialPhase(key: string, enabled: boolean, replayOnMount: boolean): EntrancePhase {
  if (!enabled) return 'idle'
  if (replayOnMount) return 'play'
  return playedEntrances.has(key) ? 'done' : 'play'
}

/**
 * One-time, interruption-safe page opening lifecycle.
 *
 * The actual choreography is CSS-driven via `data-entrance-step/order/from`, so
 * page components only annotate existing elements; no wrapper/layout changes are
 * required. A key plays once per browser document: revisiting with Back restores
 * the final UI immediately, while a real reload starts a fresh document and may
 * replay the opening as expected.
 */
export function usePageEntrance<T extends HTMLElement = HTMLDivElement>(
  key: string,
  { offsetMs = 0, enabled = true, replayOnMount = false, settleAfterMs = 1800 }: UsePageEntranceOptions = {}
) {
  const rootRef = useRef<T>(null)
  const [lifecycle, setLifecycle] = useState<EntranceLifecycle>(() => ({
    key,
    phase: initialPhase(key, enabled, replayOnMount)
  }))

  const phase: EntrancePhase = (() => {
    if (lifecycle.key !== key) return initialPhase(key, enabled, replayOnMount)
    if (!enabled) return 'idle'
    if (lifecycle.phase === 'idle') return replayOnMount || !playedEntrances.has(key) ? 'play' : 'done'
    return lifecycle.phase
  })()

  // Synchronize key/enabled changes without forcing a synchronous render from an
  // effect. The derived `phase` above already makes the first paint correct.
  useLayoutEffect(() => {
    if (lifecycle.key === key && lifecycle.phase === phase) return
    queueMicrotask(() => setLifecycle({ key, phase }))
  }, [key, lifecycle.key, lifecycle.phase, phase])

  useLayoutEffect(() => {
    if (phase !== 'play') return

    const root = rootRef.current
    if (!root) return

    const sessionKey = `${SESSION_PREFIX}${key}`
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const isReload = navigation?.type === 'reload'
    const seenInSession = sessionStorage.getItem(sessionKey) === '1'

    // Back/forward or a hard navigation may create a new JS document, so the
    // module Set alone is insufficient. Session storage survives that boundary,
    // while a genuine Reload is intentionally allowed to replay the opening.
    if (!replayOnMount && seenInSession && !isReload && !playedEntrances.has(key)) {
      playedEntrances.add(key)
      root.dataset.pageEntrance = 'done'
      queueMicrotask(() => setLifecycle((current) => (current.key === key ? { key, phase: 'done' } : current)))
      return
    }

    // Mark only after the current call stack. React Strict Mode cleans up its
    // development-only first pass before this fires, so the real pass is not
    // mistaken for a revisit and the entrance is not swallowed on reload.
    const markPlayedTimer = window.setTimeout(() => {
      playedEntrances.add(key)
      sessionStorage.setItem(sessionKey, '1')
    }, 0)

    const finish = () => {
      playedEntrances.add(key)
      sessionStorage.setItem(sessionKey, '1')
      root.dataset.pageEntrance = 'done'
      setLifecycle((current) => (current.key === key ? { key, phase: 'done' } : current))
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.dataset.pageEntrance = 'done'
      queueMicrotask(() => setLifecycle((current) => (current.key === key ? { key, phase: 'done' } : current)))
      return
    }

    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      finish()
    }

    const timer = window.setTimeout(settle, settleAfterMs + offsetMs)
    let scrollFrame = 0

    // A client-side route push scrolls the new page to its destination after the
    // component has mounted. For forward-flow screens (`replayOnMount`) that is
    // framework-owned positioning, not user intent, so it must not instantly
    // cancel the entrance we just asked to replay. Real user interaction still
    // settles immediately through wheel/touch/pointer/keyboard below.
    if (!replayOnMount) {
      const initialScrollY = window.scrollY
      const watchScroll = () => {
        if (Math.abs(window.scrollY - initialScrollY) > 4) {
          settle()
          return
        }
        scrollFrame = window.requestAnimationFrame(watchScroll)
      }
      scrollFrame = window.requestAnimationFrame(watchScroll)
      window.addEventListener('scroll', settle, { passive: true, once: true })
      document.addEventListener('scroll', settle, { capture: true, passive: true, once: true })
    }

    // Fast user interaction skips secondary motion rather than leaving old
    // entrance steps queued behind what the user is already doing.
    window.addEventListener('wheel', settle, { passive: true, once: true })
    document.addEventListener('wheel', settle, { capture: true, passive: true, once: true })
    window.addEventListener('touchstart', settle, { passive: true, once: true })
    window.addEventListener('pointerdown', settle, { passive: true, once: true })
    window.addEventListener('keydown', settle, { once: true })

    return () => {
      window.clearTimeout(markPlayedTimer)
      window.clearTimeout(timer)
      window.cancelAnimationFrame(scrollFrame)
      window.removeEventListener('wheel', settle)
      window.removeEventListener('scroll', settle)
      document.removeEventListener('wheel', settle, { capture: true })
      document.removeEventListener('scroll', settle, { capture: true })
      window.removeEventListener('touchstart', settle)
      window.removeEventListener('pointerdown', settle)
      window.removeEventListener('keydown', settle)
    }
  }, [key, offsetMs, phase, replayOnMount, settleAfterMs])

  return {
    rootRef,
    entranceState: phase === 'play' ? ('play' as const) : ('done' as const),
    entranceStyle: { '--page-entrance-offset': `${offsetMs}ms` } as CSSProperties
  }
}
