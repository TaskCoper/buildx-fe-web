'use client'

import { useCallback, useEffect, useState } from 'react'

export const DOSSIER_RENDER_TASKS = ['drawings', 'renders', 'package'] as const
export type DossierRenderTask = (typeof DOSSIER_RENDER_TASKS)[number]
type Phase = 'running' | 'settling' | 'completing' | 'files' | 'ready'

interface Frame {
  phase: Phase
  taskIndex: number
  percent: number
  heldMs: number
  elapsedMs: number
}

const INITIAL: Frame = { phase: 'running', taskIndex: 0, percent: 0, heldMs: 0, elapsedMs: 0 }
const ENDS = [45, 85, 100] as const
const STARTS = [0, 45, 85] as const

export interface DossierRenderFlow extends Frame {
  task: DossierRenderTask
  error: boolean
  longWait: boolean
  rows: { key: DossierRenderTask; percent: number; state: 'pending' | 'active' | 'settling' | 'done' | 'error' }[]
  showFiles: () => void
  finish: () => void
}

/** Presentation only: the API has no per-task telemetry. Never claim readiness before API success. */
export function useDossierRenderFlow({
  enabled,
  complete,
  error,
  expectedMs = 11_000
}: {
  enabled: boolean
  complete: boolean
  error: boolean
  expectedMs?: number
}): DossierRenderFlow {
  const [frame, setFrame] = useState<Frame>(INITIAL)

  useEffect(() => {
    if (!enabled || error || frame.phase === 'completing' || frame.phase === 'files' || frame.phase === 'ready') return
    let request = 0
    let previous = performance.now()
    let firstTick = true
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tick = (now: number) => {
      const wallDelta = Math.max(0, now - previous)
      if (wallDelta < 32) {
        request = requestAnimationFrame(tick)
        return
      }
      // Catch up after backgrounding, but never skip a stage's completion frame.
      const delta = Math.min(wallDelta, 120)
      previous = now
      const restarted = firstTick
      firstTick = false
      setFrame((current) => {
        const elapsedMs = current.elapsedMs + wallDelta
        if (current.phase === 'settling') {
          // A retry must finish the tick animation before releasing the next row.
          const heldMs = (restarted ? 0 : current.heldMs) + delta
          if (heldMs < (reduced ? 0 : 560)) return { ...current, heldMs, elapsedMs }
          if (current.taskIndex === 2) return { ...current, phase: 'completing', elapsedMs }
          return { ...current, phase: 'running', taskIndex: current.taskIndex + 1, heldMs: 0, elapsedMs }
        }
        if (current.phase !== 'running') return current
        const end = ENDS[current.taskIndex] ?? 100
        const start = STARTS[current.taskIndex] ?? 85
        const ceiling = complete ? end : Math.min(end, 95)
        const target = complete ? end : Math.min(ceiling, (elapsedMs / expectedMs) * 95)
        const speed = complete ? (end - start) / 700 : target - current.percent > 3 ? 100 / 1_200 : 95 / expectedMs
        const percent =
          reduced && complete ? end : Math.max(current.percent, Math.min(target, current.percent + delta * speed))
        if (percent === current.percent && current.elapsedMs >= Math.max(20_000, expectedMs * 1.8)) return current
        return {
          ...current,
          percent,
          elapsedMs,
          phase: percent >= end ? 'settling' : 'running',
          heldMs: 0
        }
      })
      request = requestAnimationFrame(tick)
    }
    request = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request)
  }, [enabled, complete, error, expectedMs, frame.phase])

  const showFiles = useCallback(() => {
    setFrame((current) => (current.phase === 'completing' ? { ...current, phase: 'files' } : current))
  }, [])
  const finish = useCallback(() => {
    setFrame((current) => (current.phase === 'files' ? { ...current, phase: 'ready' } : current))
  }, [])

  return {
    ...frame,
    task: DOSSIER_RENDER_TASKS[frame.taskIndex] ?? 'package',
    error,
    longWait: !complete && frame.elapsedMs >= Math.max(20_000, expectedMs * 1.8),
    rows: DOSSIER_RENDER_TASKS.map<DossierRenderFlow['rows'][number]>((key, index) => {
      const start = STARTS[index] ?? 0
      const end = ENDS[index] ?? 100
      const percent = Math.max(0, Math.min(100, ((frame.percent - start) / (end - start)) * 100))
      const state =
        error && index === frame.taskIndex
          ? 'error'
          : index < frame.taskIndex ||
              (index === frame.taskIndex && frame.phase === 'settling' && frame.heldMs >= 160) ||
              frame.phase === 'completing' ||
              frame.phase === 'files' ||
              frame.phase === 'ready'
            ? 'done'
            : index > frame.taskIndex
              ? 'pending'
              : error
                ? 'error'
                : frame.phase === 'settling'
                  ? 'settling'
                  : 'active'
      return { key, percent, state }
    }),
    showFiles,
    finish
  }
}
