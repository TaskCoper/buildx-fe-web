'use client'

import { useEffect, useRef, type CSSProperties } from 'react'

import { cn } from '@/shared/lib/utils'

const LEAF = 'oklch(0.63 0.17 149 / 0.45)'
const MOSS = 'oklch(0.52 0.14 152 / 0.4)'
const MINT = 'oklch(0.78 0.12 155 / 0.4)'

/**
 * Grid squares that fill with colour on staggered timers (varied delay/duration
 * reads as random). Positions are snapped to the 52px grid so each flare lands
 * inside a real cell; the wrapper drifts with the grid to stay aligned. Fixed
 * values keep SSR and client markup identical.
 */
const CELLS: {
  left: number
  top: number
  color: string
  delay: string
  dur: string
}[] = [
  { left: 52, top: 156, color: LEAF, delay: '0s', dur: '4.2s' },
  { left: 208, top: 312, color: MOSS, delay: '1.6s', dur: '5.1s' },
  { left: 104, top: 520, color: MINT, delay: '3.1s', dur: '4.7s' },
  { left: 312, top: 104, color: LEAF, delay: '2.2s', dur: '6.0s' },
  { left: 416, top: 416, color: MOSS, delay: '0.8s', dur: '5.4s' },
  { left: 260, top: 624, color: LEAF, delay: '4.0s', dur: '4.4s' },
  { left: 520, top: 208, color: MINT, delay: '2.7s', dur: '5.8s' },
  { left: 624, top: 468, color: LEAF, delay: '1.1s', dur: '4.9s' },
  { left: 468, top: 676, color: MOSS, delay: '3.6s', dur: '5.2s' },
  { left: 728, top: 156, color: LEAF, delay: '0.4s', dur: '6.2s' },
  { left: 832, top: 364, color: MINT, delay: '2.9s', dur: '4.6s' },
  { left: 572, top: 572, color: LEAF, delay: '1.9s', dur: '5.6s' },
  { left: 936, top: 260, color: MOSS, delay: '3.3s', dur: '5.0s' },
  { left: 780, top: 624, color: LEAF, delay: '0.6s', dur: '4.3s' }
]

/**
 * Ambient canvas for the liquid-glass surfaces — kept flat (no colour-orb
 * gradients) for legibility: an animated blueprint grid (light sweep + grid
 * cells that flare with colour), a cursor-following shimmer, and fine grain.
 * Scoped to its positioned parent; the pointer shimmer follows the cursor over
 * that area.
 */
export function AmbientAura({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn('ambient-aura pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
    >
      <span className='ambient-warm' />
      <span className='ambient-grid' />
      <span className='ambient-grid-cursor' />
      <span className='ambient-cells'>
        {CELLS.map((c) => (
          <span
            key={`${c.left}-${c.top}`}
            className='ambient-cell'
            style={
              {
                left: `${c.left}px`,
                top: `${c.top}px`,
                '--cell-color': c.color,
                '--delay': c.delay,
                '--dur': c.dur
              } as CSSProperties
            }
          />
        ))}
      </span>
      <span className='ambient-grain' />
    </div>
  )
}
