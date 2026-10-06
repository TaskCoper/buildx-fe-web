'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/shared/lib/utils'

type NumberChangeMode = 'count' | 'swap'

interface AnimatedNumberProps {
  value: number
  format?: (value: number) => string
  duration?: number
  delay?: number
  className?: string
  /** Initial render always counts up; later changes can either count or cross-slide. */
  changeMode?: NumberChangeMode
  /** Lets a parent synchronize a border/ring accent with the final number. */
  onSettled?: () => void
  /** Start without waiting for IntersectionObserver (used by the focal M06 grand total). */
  startImmediately?: boolean
}

/**
 * Small requestAnimationFrame counter shared by M01 statistics and M06 money.
 * It starts only when visible and never rewinds when a fresher server value
 * arrives. M01 opts into `swap` so later count changes replace only the changed
 * number while the first appearance still counts slowly from zero.
 */
export function AnimatedNumber({
  value,
  format = String,
  duration = 1_300,
  delay = 0,
  className,
  changeMode = 'count',
  onSettled,
  startImmediately = false
}: AnimatedNumberProps) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const paintedRef = useRef(0)
  const hasSettledRef = useRef(false)
  const [painted, setPainted] = useState(0)
  const [visible, setVisible] = useState(startImmediately)
  const [changing, setChanging] = useState(false)
  const [outgoing, setOutgoing] = useState<number | null>(null)

  useEffect(() => {
    if (startImmediately) return
    const host = hostRef.current
    if (!host) return
    if (!('IntersectionObserver' in window)) {
      const timer = setTimeout(() => setVisible(true), 0)
      return () => clearTimeout(timer)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.35 }
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [startImmediately])

  useEffect(() => {
    if (!visible) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paintedRef.current = value
      hasSettledRef.current = true
      const timer = window.setTimeout(() => {
        setOutgoing(null)
        setChanging(false)
        setPainted(value)
        onSettled?.()
      }, 0)
      return () => window.clearTimeout(timer)
    }

    let frame = 0
    let delayTimer = 0
    let settleTimer = 0
    const from = paintedRef.current
    const distance = value - from
    const swapUpdate = changeMode === 'swap' && hasSettledRef.current && distance !== 0

    const settle = () => {
      paintedRef.current = value
      hasSettledRef.current = true
      setPainted(value)
      setChanging(false)
      setOutgoing(null)
      onSettled?.()
    }

    const run = () => {
      if (distance === 0) {
        hasSettledRef.current = true
        onSettled?.()
        return
      }

      if (swapUpdate) {
        setOutgoing(Math.round(from))
        setChanging(true)
        paintedRef.current = value
        setPainted(value)
        settleTimer = window.setTimeout(settle, 320)
        return
      }

      setChanging(true)
      const startedAt = performance.now()
      const tick = (now: number) => {
        const elapsed = Math.min(1, (now - startedAt) / duration)
        const eased = 1 - Math.pow(1 - elapsed, 3)
        const next = from + distance * eased
        paintedRef.current = next
        setPainted(next)

        if (elapsed < 1) {
          frame = requestAnimationFrame(tick)
          return
        }

        settle()
      }
      frame = requestAnimationFrame(tick)
    }

    delayTimer = window.setTimeout(run, swapUpdate ? 0 : delay)
    return () => {
      window.clearTimeout(delayTimer)
      window.clearTimeout(settleTimer)
      cancelAnimationFrame(frame)
    }
  }, [changeMode, delay, duration, onSettled, value, visible])

  return (
    <span ref={hostRef} data-number-changing={changing} className={cn('relative inline-grid tabular-nums', className)}>
      {outgoing !== null ? (
        <span data-number-old aria-hidden className='col-start-1 row-start-1'>
          {format(outgoing)}
        </span>
      ) : null}
      <span data-number-new={outgoing !== null} className='col-start-1 row-start-1'>
        {format(Math.round(painted))}
      </span>
    </span>
  )
}
