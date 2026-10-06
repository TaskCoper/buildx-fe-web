'use client'

import { useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/utils'
import type { PlanCycle } from '../types/plan.types'

const CYCLES: readonly PlanCycle[] = ['Month', 'Year']

interface PlanCycleToggleProps {
  value: PlanCycle
  onChange: (cycle: PlanCycle) => void
  /** Phần trăm tiết kiệm lớn nhất khi mua năm; null thì không in nhãn. */
  saving: number | null
}

/**
 * Công tắc Tháng / Năm của trang Bảng giá. Hai nút độc lập (`aria-pressed`) thay vì
 * radiogroup: radiogroup buộc phải tự làm đủ phím mũi tên, làm nửa vời còn tệ hơn.
 */
export function PlanCycleToggle({ value, onChange, saving }: PlanCycleToggleProps) {
  const t = useTranslations('plans.cycle')

  return (
    <div className='flex justify-center'>
      <div
        role='group'
        aria-label={t('label')}
        className='bg-muted/60 inline-flex items-center gap-1 rounded-full border p-1'
      >
        {CYCLES.map((cycle) => {
          const active = cycle === value
          return (
            <button
              key={cycle}
              type='button'
              aria-pressed={active}
              onClick={() => onChange(cycle)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-5 py-1.5 text-sm font-semibold transition-colors',
                active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t(cycle === 'Month' ? 'month' : 'year')}
              {cycle === 'Year' && saving ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 max-md:text-xs text-[11px] font-bold',
                    active ? 'bg-primary-foreground/20' : 'bg-brand-orange/15 text-brand-orange'
                  )}
                >
                  {t('saving', { percent: saving })}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
