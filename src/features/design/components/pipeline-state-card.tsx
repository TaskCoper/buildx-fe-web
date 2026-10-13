'use client'

import type { ReactNode } from 'react'

import { progressPercent, type StageProgress } from '../services/pipeline.logic'

/** Thẻ trạng thái của một chặng (đang chờ, đang chạy, lỗi, chưa bắt đầu…), dùng chung cho các màn chặng. */
export function StageStateCard({
  icon,
  title,
  description,
  children
}: {
  icon: ReactNode
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <section className='bg-card mx-auto flex max-w-xl flex-col items-center gap-3 rounded-2xl border p-8 text-center shadow-xs'>
      {icon}
      <h2 className='text-lg font-semibold text-balance'>{title}</h2>
      {description ? <p className='text-muted-foreground text-sm text-pretty'>{description}</p> : null}
      {children ? <div className='mt-2 flex flex-wrap justify-center gap-2'>{children}</div> : null}
    </section>
  )
}

/**
 * Thanh tiến độ x/y bước do executor ghi (TDD-PROJ-006, `progress`) và hạn hoàn tất. Không đoán phần trăm theo thời
 * gian: chưa biết tổng thì thanh không hiện, chỉ còn dòng chữ.
 */
export function StageRunProgress({
  progress,
  progressText,
  deadlineText
}: {
  progress: StageProgress | null | undefined
  progressText?: string
  deadlineText?: string
}) {
  const percent = progressPercent(progress)
  return (
    <div className='w-full max-w-sm space-y-2'>
      {progress ? (
        <>
          <div className='bg-muted h-2 overflow-hidden rounded-full'>
            <div
              className='bg-primary h-full rounded-full transition-[width] duration-500'
              style={{ width: `${percent ?? 0}%` }}
            />
          </div>
          {progressText ? <p className='text-muted-foreground text-xs'>{progressText}</p> : null}
        </>
      ) : null}
      {deadlineText ? <p className='text-muted-foreground text-xs'>{deadlineText}</p> : null}
    </div>
  )
}
