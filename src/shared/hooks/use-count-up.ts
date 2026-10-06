'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'

interface UseCountUpOptions {
  /** How long the count takes to finish, in seconds. */
  duration?: number
  /** Wait until the number itself is revealed before starting the count. */
  delay?: number
  /** Fraction of the element that must be visible to start counting. */
  amount?: number
}

/**
 * Counts up from 0 to `value` once its element scrolls into view — the stats
 * strip (mục II.2, vùng 03). Counts exactly once: leaving the viewport before
 * it finishes (a fast scroll-past) jumps straight to the final value instead
 * of leaving the number stuck mid-count or restarting later.
 */
/** Chưa đếm được sau chừng này (ms) thì hiện luôn số cuối — không bao giờ kẹt ở 0. */
const FALLBACK_MS = 4000

export function useCountUp(value: number, { duration = 1, delay = 0, amount = 0.2 }: UseCountUpOptions = {}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { amount })
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(() => (value === 1 ? 1 : 0))
  const hasEnteredRef = useRef(false)
  const doneRef = useRef(false)

  // Lưới an toàn (góp ý BuildX: trên điện thoại có lúc đứng ở "0 nhà thầu"):
  // cuộn nhanh qua mà ô chưa lần nào lọt đủ vào màn hình thì không có sự kiện
  // nào để đếm — hết giờ chờ mà chưa đếm thì hiện thẳng số cuối.
  useEffect(() => {
    if (value === 1 || reduceMotion) return
    const timer = window.setTimeout(() => {
      if (hasEnteredRef.current || doneRef.current) return
      doneRef.current = true
      setDisplay(value)
    }, FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [value, reduceMotion])

  useEffect(() => {
    if (doneRef.current || value === 1 || reduceMotion) return

    if (inView) {
      hasEnteredRef.current = true

      const controls = animate(0, value, {
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (latest) => setDisplay(Math.round(latest)),
        onComplete: () => {
          setDisplay(value)
          doneRef.current = true
        }
      })
      return () => controls.stop()
    }

    if (hasEnteredRef.current) {
      setDisplay(value)
      doneRef.current = true
    }
  }, [inView, value, duration, delay, reduceMotion])

  return { ref, display: reduceMotion || value === 1 ? value : display }
}
