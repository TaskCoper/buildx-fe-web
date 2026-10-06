'use client'

import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { revealEase } from '@/shared/components/common'
import { cn } from '@/shared/lib/utils'

export const BRIEF_STEP_TRANSITION_KEY = 'savico.brief-step-transition'

export function BriefSteps({
  current,
  progress,
  animateDoneCheck
}: {
  current: 1 | 2
  /**
   * Đường nối 1→2 tô dần theo số ô bắt buộc đã điền (M02, mục 3) — 0..1. Bỏ
   * qua thì đường nối đứng yên màu xám như trước (M03 truyền 1: bước 1 đã
   * xong hẳn).
   */
  progress?: number
  /**
   * Sang M03 từ M02 thì dấu tick của bước 1 chạy chuỗi vẽ vào; mở lại một
   * nháp đã có sẵn thì hiện tick tĩnh, không hiệu ứng (M03, mục 3).
   */
  animateDoneCheck?: boolean
}) {
  const t = useTranslations('contractors.brief.steps')
  // Dòng trạng thái dưới tên nấc dùng chung bản dịch với stepper của luồng tạo dự án.
  const tStatus = useTranslations('design.steps.status')
  const steps = [t('one'), t('two')]

  // Cùng khung với `StepProgress` của luồng tạo dự án: vòng tròn TRÊN, nhãn + trạng
  // thái DƯỚI, các nấc chia đều chiều rộng, đường nối chạy qua tâm hai vòng.
  return (
    <ol className='bg-card relative flex w-full min-w-0 items-start rounded-2xl border px-4 py-4 shadow-sm sm:px-6'>
      {steps.map((label, index) => {
        const step = index + 1
        const done = step < current
        const active = step === current
        return (
          <li
            key={label}
            style={{ zIndex: steps.length - index }}
            className='relative flex min-w-0 flex-1 flex-col items-center gap-1.5'
          >
            {/* Đường nối vẽ bằng nấc SAU, kéo từ tâm nấc trước sang tâm nấc này; vệt
                xanh phủ lên là lớp PHỦ THÊM, đường xám gốc vẫn nguyên vẹn bên dưới. */}
            {index > 0 ? (
              <span
                aria-hidden
                className='bg-border absolute top-[1.125rem] -left-1/2 z-0 h-0.5 w-full overflow-hidden rounded-full'
              >
                {typeof progress === 'number' ? (
                  <motion.span
                    initial={false}
                    animate={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%` }}
                    transition={{ duration: 0.3, ease: revealEase }}
                    className='bg-primary absolute inset-y-0 left-0 rounded-full'
                  />
                ) : null}
              </span>
            ) : null}

            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                done || active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border'
              )}
            >
              {done ? (
                animateDoneCheck ? (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', bounce: 0.6, duration: 0.4, delay: 0.15 * step }}
                  >
                    <Check className='size-4.5' />
                  </motion.span>
                ) : (
                  <Check className='size-4.5' />
                )
              ) : (
                step
              )}
            </span>

            <span className='min-w-0 px-2 text-center'>
              <span
                className={cn(
                  'block truncate text-sm font-semibold',
                  active ? 'text-primary-strong' : done ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
              <span className='text-muted-foreground block truncate text-xs'>
                {tStatus(done ? 'done' : active ? 'current' : 'pending')}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
