'use client'

import { BadgeCheck, Clock, MapPin, Map as MapIcon, Star } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { cn } from '@/shared/lib/utils'
import { formatNumber } from '@/shared/utils'
import type { Contractor } from '../types/contractor.types'

interface ContractorStatsProps {
  contractor: Contractor
  /** Bỏ bớt các chỉ số phụ khi đặt trong cột hẹp (thẻ so sánh, panel phải). */
  dense?: boolean
  className?: string
}

/**
 * Dòng chỉ số của một nhà thầu: đánh giá · dự án tương tự · khoảng cách · phạm
 * vi phục vụ · thời gian khảo sát.
 *
 * Đặt riêng vì đúng bộ chỉ số này lặp lại ở S12 (thẻ danh sách), S13/S14
 * (header hồ sơ) và S16 (thẻ nhà thầu trên màn chọn lịch) — dựng lại ở từng chỗ
 * là cách chắc chắn nhất để ba màn nói ba con số khác nhau.
 *
 * R2: không có chỉ số nào liên quan tới giá.
 */
export function ContractorStats({ contractor, dense = false, className }: ContractorStatsProps) {
  const t = useTranslations('contractors.common')
  const locale = useLocale() as Locale

  const rating = formatNumber(contractor.rating, locale, { minimumFractionDigits: 1 })
  const distance = formatNumber(contractor.distanceKm, locale, { minimumFractionDigits: 1 })

  return (
    <ul className={cn('text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-xs', className)}>
      <li className='flex items-center gap-1.5'>
        <Star className='text-warning size-3.5 shrink-0' />
        <span className='text-foreground font-semibold'>{rating}/5</span>
        <span>{t('reviewCount', { count: contractor.reviewCount })}</span>
      </li>

      <li className='flex items-center gap-1.5'>
        <BadgeCheck className='text-primary size-3.5 shrink-0' />
        <span>{t('similarProjects', { count: contractor.similarProjects })}</span>
      </li>

      <li className='flex items-center gap-1.5'>
        <MapPin className='text-primary size-3.5 shrink-0' />
        <span>{contractor.distanceKnown === false ? t('distanceUnknown') : t('distance', { km: distance })}</span>
      </li>

      {dense ? null : (
        <li className='flex items-center gap-1.5'>
          <MapIcon className='text-primary size-3.5 shrink-0' />
          <span>
            {t('serviceAreas')}: {contractor.serviceAreas.slice(0, 2).join(', ')}
          </span>
        </li>
      )}

      <li className='flex items-center gap-1.5'>
        <Clock className='text-primary size-3.5 shrink-0' />
        <span>{t('surveyWithin', { hours: contractor.surveyWithinHours })}</span>
      </li>
    </ul>
  )
}
