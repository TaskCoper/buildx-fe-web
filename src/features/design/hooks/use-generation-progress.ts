'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import type { GenerationProgress } from '../types/design.types'

/** Stage labels resolved from the `design.progress.<flow>.stages` message list. */
const STAGE_COUNT = 4

/** How often the ring advances. */
const TICK_MS = 250

/** The ring creeps to this ceiling and waits there for the real result. */
const CEILING = 95

interface UseGenerationProgressOptions {
  /** `estimate` for màn chờ Bước 2, `dossier` for màn chờ render Bước 3. */
  flow: 'estimate' | 'dossier'
  /** Flip to true when the underlying mutation resolves — snaps the ring to 100%. */
  complete: boolean
  /**
   * Roughly how long the work takes, so the ring paces itself across all four
   * stages instead of racing to the ceiling and sitting there.
   */
  expectedMs?: number
  /** Freeze at the current truthful value while the backend is in an error state. */
  paused?: boolean
}

/**
 * Vòng tròn tiến độ % cho màn chờ Bước 2 và Bước 3 (mục III.3a, III.4b).
 *
 * Creeps roughly linearly toward 95% over `expectedMs` so the four status lines
 * each get screen time, then snaps to 100% once the real result lands. Purely
 * presentational — it never gates the actual data.
 */
export function useGenerationProgress({
  flow,
  complete,
  expectedMs = 9_000,
  paused = false
}: UseGenerationProgressOptions): GenerationProgress {
  const t = useTranslations(`design.progress.${flow}`)
  const [creep, setCreep] = useState(0)
  const startedAtRef = useRef<number | null>(null)
  const pausedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (complete) return
    if (paused) {
      if (pausedAtRef.current === null) pausedAtRef.current = Date.now()
      return
    }
    if (pausedAtRef.current !== null && startedAtRef.current !== null) {
      startedAtRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = null
    }
    if (startedAtRef.current === null) startedAtRef.current = Date.now() - (creep / CEILING) * expectedMs

    const synchronize = () => {
      const startedAt = startedAtRef.current ?? Date.now()
      const elapsed = Math.max(0, Date.now() - startedAt)
      const truthful = Math.min(CEILING, (elapsed / expectedMs) * CEILING)
      // Date-based catch-up keeps the ring truthful after a background tab is
      // restored, while max() guarantees that it never travels backwards.
      setCreep((current) => Math.max(current, truthful))
    }

    synchronize()
    const timer = window.setInterval(synchronize, TICK_MS)
    document.addEventListener('visibilitychange', synchronize)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', synchronize)
    }
    // `creep` only seeds the start time on the first run; depending on it would restart the timer every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, expectedMs, paused])

  // 100% is derived, not stored — writing it from the effect would cascade renders.
  const percent = complete ? 100 : creep
  const stageIndex = Math.min(STAGE_COUNT - 1, Math.floor((percent / 100) * STAGE_COUNT))

  return {
    percent,
    stage: t(`stages.${stageIndex}`),
    done: complete
  }
}
