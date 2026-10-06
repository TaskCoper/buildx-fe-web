'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Slider } from '@/shared/components/ui/slider'
import { cn } from '@/shared/lib/utils'
import { PACKAGE_TIERS } from '../constants/design.constants'
import type { PackageTier } from '../types/design.types'
import { FieldLabel } from '@/shared/components/common'

interface PackageSliderProps {
  value: PackageTier
  onChange: (value: PackageTier) => void
}

/**
 * Trường 6 — Gói hoàn thiện & nội thất (mục III.2).
 * Thanh kéo 3 nấc: Cơ bản - Tiêu chuẩn - VIP; mặc định Tiêu chuẩn.
 * Một gói chung cho cả vật liệu hoàn thiện và nội thất.
 */
export function PackageSlider({ value, onChange }: PackageSliderProps) {
  const t = useTranslations('design.input.packageTier')
  const index = Math.max(0, PACKAGE_TIERS.indexOf(value))
  const [dragValue, setDragValue] = useState<number | null>(null)
  const sliderValue = dragValue ?? index
  const activeIndex = Math.round(sliderValue)

  return (
    <div className='space-y-3'>
      <FieldLabel hint={t('hint')} required>
        {t('label')}
      </FieldLabel>

      <Slider
        data-package-slider
        min={0}
        max={PACKAGE_TIERS.length - 1}
        step={0.01}
        value={[sliderValue]}
        aria-label={t('label')}
        onValueChange={([next]) => {
          setDragValue(next ?? index)
        }}
        onValueCommit={([next]) => {
          const snappedIndex = Math.round(next ?? index)
          const tier = PACKAGE_TIERS[snappedIndex]
          setDragValue(null)
          if (tier) onChange(tier)
        }}
      />

      <div className='flex justify-between'>
        {PACKAGE_TIERS.map((tier) => (
          <button
            key={tier}
            type='button'
            onClick={() => {
              setDragValue(null)
              onChange(tier)
            }}
            data-package-label
            data-active={PACKAGE_TIERS[activeIndex] === tier}
            className={cn(
              'text-xs font-medium transition-colors',
              PACKAGE_TIERS[activeIndex] === tier
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`options.${tier}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
