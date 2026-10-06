'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState, type CSSProperties } from 'react'

import type { Locale } from '@/i18n/routing'
import { formatCurrency } from '@/shared/utils'
import { costShares } from '../services/estimate.service'
import type { EstimateSection } from '../types/design.types'

const SECTION_COLOR = {
  structure: 'var(--chart-1)',
  finishing: 'var(--chart-2)',
  interior: 'var(--chart-3)'
} as const

function pointAt(turn: number, radius = 100) {
  const angle = turn * Math.PI * 2 - Math.PI / 2
  return { x: 100 + Math.cos(angle) * radius, y: 100 + Math.sin(angle) * radius }
}

/** Two arcs also cover a 100% slice without coincident-endpoint ambiguity. */
function sectorPath(start: number, end: number) {
  if (end <= start) return ''
  const from = pointAt(start)
  const middle = pointAt((start + end) / 2)
  const to = pointAt(end)
  return `M 100 100 L ${from.x} ${from.y} A 100 100 0 0 1 ${middle.x} ${middle.y} A 100 100 0 0 1 ${to.x} ${to.y} Z`
}

/** M06: one clockwise sweep, largest slice first, when this chart enters view. */
export function CostDonut({ sections, enabled = true }: { sections: readonly EstimateSection[]; enabled?: boolean }) {
  const t = useTranslations('design.estimate')
  const locale = useLocale() as Locale
  const rootRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState<EstimateSection['section'] | null>(null)
  const [progress, setProgress] = useState(0)
  const shares = costShares(sections)
  const total = shares.reduce((sum, share) => sum + Math.max(0, share.amount), 0)
  const sweep = Math.max(0, Math.min(1, progress))
  const slices = [...shares]
    .sort((a, b) => b.amount - a.amount)
    .reduce<((typeof shares)[number] & { start: number; end: number })[]>((acc, share) => {
      const start = acc[acc.length - 1]?.end ?? 0
      const end = start + (total > 0 ? Math.max(0, share.amount) / total : 0)
      acc.push({ ...share, start, end })
      return acc
    }, [])

  useEffect(() => {
    if (!enabled) return
    const root = rootRef.current
    if (!root) return

    let frame = 0
    let started = false
    const draw = () => {
      if (started) return
      started = true

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setProgress(1)
        return
      }

      const startedAt = performance.now()
      const tick = (now: number) => {
        const elapsed = Math.min(1, (now - startedAt) / 1_800)
        setProgress(1 - Math.pow(1 - elapsed, 3))
        if (elapsed < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    if (!('IntersectionObserver' in window)) {
      draw()
      return () => cancelAnimationFrame(frame)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        draw()
        observer.disconnect()
      },
      { threshold: 0.3 }
    )
    observer.observe(root)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [enabled])

  return (
    <div ref={rootRef} className='flex flex-col items-center gap-6 sm:flex-row sm:items-center'>
      <div className='relative size-44 shrink-0 overflow-visible'>
        <svg
          viewBox='0 0 200 200'
          className='size-full overflow-visible'
          aria-hidden
          onMouseLeave={() => setHovered(null)}
        >
          {slices.map((slice) => {
            const mid = (slice.start + slice.end) / 2
            const label = pointAt(mid, 60)
            const offset = pointAt(mid, 5)
            const complete = sweep >= slice.end - 0.000001
            return (
              <g
                key={slice.section}
                data-donut-slice
                data-active={hovered === slice.section}
                data-muted={hovered !== null && hovered !== slice.section}
                onMouseEnter={() => {
                  if (sweep === 1) setHovered(slice.section)
                }}
                style={
                  {
                    '--slice-x': `${offset.x - 100}px`,
                    '--slice-y': `${offset.y - 100}px`
                  } as CSSProperties
                }
              >
                <path d={sectorPath(slice.start, Math.min(slice.end, sweep))} fill={SECTION_COLOR[slice.section]} />
                {slice.percent >= 5 ? (
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor='middle'
                    dominantBaseline='central'
                    className='pointer-events-none fill-background text-[15px] font-bold'
                    data-donut-label
                    data-visible={complete}
                  >
                    {slice.percent}%
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
      </div>

      <ul className='w-full min-w-0 space-y-3.5'>
        {shares.map((share) => {
          const slice = slices.find((item) => item.section === share.section)
          const complete = slice !== undefined && sweep >= slice.end - 0.000001
          return (
            <li
              key={share.section}
              data-donut-legend
              data-visible={complete}
              data-active={hovered === share.section}
              data-muted={hovered !== null && hovered !== share.section}
              className='flex items-start gap-2.5'
            >
              <span
                aria-hidden
                className='mt-1.5 size-2.5 shrink-0 rounded-full'
                style={{ backgroundColor: SECTION_COLOR[share.section] }}
              />
              <span className='min-w-0'>
                <span className='block text-sm font-medium'>{t(`sections.${share.section}`)}</span>
                <span className='text-muted-foreground block text-sm whitespace-nowrap tabular-nums'>
                  {formatCurrency(share.amount, locale)}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
