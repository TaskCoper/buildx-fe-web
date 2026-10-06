'use client'

import { Check, Lightbulb } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { cn } from '@/shared/lib/utils'

interface RenderProgressBarsProps {
  /** Tiến độ tổng của vòng tròn, dùng để suy tiến độ từng công đoạn. */
  percent: number
}

/**
 * Ba công đoạn render và số phần việc của mỗi công đoạn (Hình 10).
 * `weight` là tỷ trọng công đoạn trong tổng tiến độ, cộng lại bằng 1.
 */
const TASKS = [
  { key: 'drawings', total: 8, weight: 0.45 },
  { key: 'renders', total: 4, weight: 0.4 },
  { key: 'package', total: 1, weight: 0.15 }
] as const

/** Tiến độ riêng của một công đoạn, quy từ tiến độ tổng. */
function taskPercent(percent: number, start: number, weight: number): number {
  return Math.max(0, Math.min(100, ((percent - start) / (weight * 100)) * 100))
}

/**
 * Ba thanh tiến độ con của màn chờ render Bước 3 (mục IV.7, Hình 10):
 * "Đang xử lý bản vẽ (3/8) — 38%", "Đang render phối cảnh (1/4) — 25%",
 * "Đóng gói PDF — Chờ xử lý", kèm hộp mẹo nền vàng nhạt bên dưới.
 *
 * Các công đoạn chạy TUẦN TỰ: công đoạn sau chỉ nhúc nhích khi công đoạn trước
 * đã xong, nên tiến độ tổng được chia theo `weight` rồi quy về từng thanh.
 */
export function RenderProgressBars({ percent }: RenderProgressBarsProps) {
  const t = useTranslations('design.progress.dossier')
  const [visibleRows, setVisibleRows] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const timer = window.setTimeout(() => setVisibleRows(TASKS.length), 0)
      return () => window.clearTimeout(timer)
    }

    const timers = [120, 330, 540].map((delay, index) => window.setTimeout(() => setVisibleRows(index + 1), delay))

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const [drawings, renders, packaging] = TASKS
  const drawingsPercent = taskPercent(percent, 0, drawings.weight)
  const rendersPercent = taskPercent(percent, drawings.weight * 100, renders.weight)
  const packagingPercent = taskPercent(percent, (drawings.weight + renders.weight) * 100, packaging.weight)

  /** Số phần việc đã xong của một công đoạn, suy từ % của chính nó. */
  const doneOf = (own: number, total: number) => Math.min(total, Math.floor((own / 100) * total))

  // Nhãn viết thẳng thay vì map: hai công đoạn đầu có biến ICU `{done}/{total}`,
  // công đoạn cuối thì không — gọi động sẽ làm hỏng kiểu của `t`.
  const rows = [
    { key: drawings.key, own: drawingsPercent, label: t('tasks.drawings', { done: doneOf(drawingsPercent, drawings.total), total: drawings.total }) }, // prettier-ignore
    { key: renders.key, own: rendersPercent, label: t('tasks.renders', { done: doneOf(rendersPercent, renders.total), total: renders.total }) }, // prettier-ignore
    { key: packaging.key, own: packagingPercent, label: t('tasks.package') }
  ]

  return (
    <div className='w-full space-y-5 text-left'>
      <ul className='space-y-4'>
        {rows.slice(0, visibleRows).map((row, index) => {
          const pending = row.own <= 0
          const done = row.own >= 100
          return (
            <li
              key={row.key}
              data-render-row
              data-render-row-index={index}
              data-state={done ? 'done' : pending ? 'pending' : 'active'}
              className='space-y-2'
            >
              <div className='flex items-center justify-between gap-3'>
                <span className={cn('text-sm', pending ? 'text-muted-foreground' : 'text-foreground')}>
                  {row.label}
                </span>

                {done ? (
                  <span
                    data-render-check
                    className='bg-accent text-primary-strong flex size-6 shrink-0 items-center justify-center rounded-full'
                  >
                    <Check className='size-3.5' strokeWidth={3} />
                  </span>
                ) : pending ? (
                  <span className='bg-muted text-muted-foreground shrink-0 rounded-md px-2 py-0.5 text-xs font-medium'>
                    {t('pending')}
                  </span>
                ) : (
                  <span data-progress-value className='shrink-0 text-sm font-semibold tabular-nums'>
                    {Math.round(row.own)}%
                  </span>
                )}
              </div>

              <div className='bg-muted h-2 overflow-hidden rounded-full'>
                <div
                  data-render-bar
                  className='bg-primary h-full rounded-full transition-[width] duration-500 ease-out'
                  style={{ width: `${row.own}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      {visibleRows === rows.length ? (
        <p data-render-tip className='bg-warning/12 border-warning/30 flex gap-2.5 rounded-xl border p-3.5 text-sm'>
          <Lightbulb className='text-warning-strong mt-0.5 size-4 shrink-0' />
          <span className='text-pretty'>
            <span className='font-medium'>{t('tipLabel')}</span> {t('tip')}
          </span>
        </p>
      ) : null}
    </div>
  )
}
