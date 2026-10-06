'use client'

import type { ReactNode } from 'react'
import { motion, type Transition, type Variants } from 'motion/react'

/** Expo-out easing — the smooth, decelerating curve Framer-style sites use. */
export const revealEase = [0.16, 1, 0.3, 1] as const

/** Springy transition for interactive hover/tap. */
export const revealSpring: Transition = { type: 'spring', stiffness: 170, damping: 25, mass: 0.8 }

/** Stagger-item variants — children of <RevealStagger> use these. */
export const revealItemVariants: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: revealEase } }
}

/** Stagger item that sweeps in from the left (nice left→right cascade). */
export const revealItemLeft: Variants = {
  hidden: { opacity: 0, x: -52 },
  show: { opacity: 1, x: 0, transition: { duration: 0.65, ease: revealEase } }
}

/** Stagger item that pops in from the center. */
export const revealItemScale: Variants = {
  hidden: { opacity: 0, scale: 0.82, y: 18 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: revealEase } }
}

export const revealContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } }
}

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'none'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Which way the element flies in from. */
  direction?: RevealDirection
  /** Fly-in distance in px. */
  distance?: number
  delay?: number
  once?: boolean
  /** Fraction of the element that must be visible to trigger. */
  amount?: number
}

/** Single element: fly + fade into place when scrolled into view. */
export function Reveal({
  children,
  className,
  direction = 'up',
  distance = 40,
  delay = 0,
  once = true,
  amount = 0.25
}: RevealProps) {
  const from =
    direction === 'up'
      ? { y: distance }
      : direction === 'down'
        ? { y: -distance }
        : direction === 'left'
          ? { x: -distance }
          : direction === 'right'
            ? { x: distance }
            : {}
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: 0, y: 0, ...from }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.85, ease: revealEase, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Container that staggers its <RevealItem> (or `motion` variant) children. */
export function RevealStagger({
  children,
  className,
  once = true,
  amount = 0.2
}: {
  children: ReactNode
  className?: string
  once?: boolean
  amount?: number
}) {
  return (
    <motion.div
      className={className}
      variants={revealContainerVariants}
      initial='hidden'
      whileInView='show'
      viewport={{ once, amount }}
    >
      {children}
    </motion.div>
  )
}

/** A staggered child. Set `lift` for a springy hover raise. */
export function RevealItem({
  children,
  className,
  lift = false
}: {
  children: ReactNode
  className?: string
  lift?: boolean
}) {
  return (
    <motion.div
      className={className}
      variants={revealItemVariants}
      whileHover={lift ? { y: -3 } : undefined}
      transition={lift ? revealSpring : undefined}
    >
      {children}
    </motion.div>
  )
}
