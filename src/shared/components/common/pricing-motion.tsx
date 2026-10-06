'use client'

import {
  animate,
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
  type Variants
} from 'motion/react'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export const pricingEase = [0.16, 1, 0.3, 1] as const

export const pricingSpring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 24,
  mass: 0.8
}

export const pricingStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } }
}

export const pricingReveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: pricingEase } }
}

export const pricingRevealLeft: Variants = {
  hidden: { opacity: 0, x: -18 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: pricingEase } }
}

interface PricingMotionState {
  isScrolling: boolean
  reduceMotion: boolean
}

const PricingMotionContext = createContext<PricingMotionState>({
  isScrolling: false,
  reduceMotion: false
})

/** One scroll listener per pricing page; ambient loops consume this context. */
export function PricingMotionProvider({ children }: { children: ReactNode }) {
  const [isScrolling, setIsScrolling] = useState(false)
  const reduceMotion = Boolean(useReducedMotion())

  useEffect(() => {
    let stopTimer: ReturnType<typeof setTimeout> | undefined
    let restoreFrame = 0
    let restoring = false
    const scrollKey = `pricing-scroll:${location.pathname}${location.search}`
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const previousScrollRestoration = history.scrollRestoration

    history.scrollRestoration = 'manual'

    const saveScrollPosition = () => {
      if (restoring) return
      sessionStorage.setItem(scrollKey, String(window.scrollY))
    }

    if (navigation?.type === 'reload') {
      const saved = Number(sessionStorage.getItem(scrollKey))
      if (Number.isFinite(saved) && saved > 0) {
        restoring = true
        const startedAt = performance.now()

        const restore = () => {
          const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
          const target = Math.min(saved, maxScroll)
          window.scrollTo({ top: target, behavior: 'instant' })

          const pageIsTallEnough = maxScroll >= saved - 2
          const positionIsRestored = Math.abs(window.scrollY - saved) <= 2
          const timedOut = performance.now() - startedAt > 4000

          if ((pageIsTallEnough && positionIsRestored) || timedOut) {
            restoring = false
            sessionStorage.setItem(scrollKey, String(window.scrollY))
            return
          }

          restoreFrame = requestAnimationFrame(restore)
        }

        restoreFrame = requestAnimationFrame(restore)
      }
    }

    const onScroll = () => {
      saveScrollPosition()
      setIsScrolling(true)
      document.documentElement.dataset.pricingScrolling = 'true'
      if (stopTimer) clearTimeout(stopTimer)
      stopTimer = setTimeout(() => {
        setIsScrolling(false)
        delete document.documentElement.dataset.pricingScrolling
      }, 160)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', saveScrollPosition)
    return () => {
      delete document.documentElement.dataset.pricingScrolling
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', saveScrollPosition)
      cancelAnimationFrame(restoreFrame)
      saveScrollPosition()
      history.scrollRestoration = previousScrollRestoration
      if (stopTimer) clearTimeout(stopTimer)
    }
  }, [])

  const value = useMemo(() => ({ isScrolling, reduceMotion }), [isScrolling, reduceMotion])

  return <PricingMotionContext.Provider value={value}>{children}</PricingMotionContext.Provider>
}

export function usePricingMotion() {
  return useContext(PricingMotionContext)
}

export function PricingBackToTop({ label }: { label: string }) {
  const { reduceMotion } = usePricingMotion()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(window.scrollY > Math.min(720, window.innerHeight * 0.9))
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type='button'
          aria-label={label}
          className='bg-primary text-primary-foreground fixed right-5 bottom-24 z-30 flex size-11 items-center justify-center rounded-full shadow-lg focus-visible:ring-2 focus-visible:ring-ring sm:right-7'
          initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.94 }}
          whileHover={reduceMotion ? undefined : { y: -2 }}
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
          transition={{ duration: reduceMotion ? 0.01 : 0.25, ease: pricingEase }}
          onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })}
        >
          <motion.span whileHover={reduceMotion ? undefined : { y: -2 }}>
            <svg
              aria-hidden
              viewBox='0 0 24 24'
              className='size-5'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='m18 15-6-6-6 6' />
            </svg>
          </motion.span>
        </motion.button>
      ) : null}
    </AnimatePresence>
  )
}

export function PricingReveal({
  children,
  className,
  delay = 0,
  amount = 0.18
}: {
  children: ReactNode
  className?: string
  delay?: number
  amount?: number
}) {
  const { reduceMotion } = usePricingMotion()

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : 'hidden'}
      whileInView='show'
      viewport={{ once: true, amount }}
      variants={reduceMotion ? { show: { opacity: 1 } } : pricingReveal}
      transition={reduceMotion ? { duration: 0.01 } : { delay }}
    >
      {children}
    </motion.div>
  )
}

/** Count-up that exposes only the final value to assistive technology. */
export function AnimatedNumber({
  value,
  format,
  className,
  delay = 0,
  duration = 0.8
}: {
  value: number
  format: (value: number) => string
  className?: string
  delay?: number
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.65 })
  const { reduceMotion } = usePricingMotion()
  const number = useMotionValue(reduceMotion ? value : Math.max(0, Math.round(value * 0.12)))
  const display = useTransform(number, (current) => format(Math.round(current)))

  useEffect(() => {
    if (!inView || reduceMotion) {
      if (reduceMotion) number.set(value)
      return
    }

    const controls = animate(number, value, {
      duration,
      delay,
      ease: pricingEase
    })
    return () => controls.stop()
  }, [delay, duration, inView, number, reduceMotion, value])

  return (
    <>
      <span className='sr-only'>{format(value)}</span>
      <motion.span ref={ref} aria-hidden className={className}>
        {display}
      </motion.span>
    </>
  )
}
