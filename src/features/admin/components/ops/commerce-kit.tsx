'use client'

import { DatePicker } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { formatCurrency } from '@/shared/utils'

/**
 * Mảnh dùng chung của các màn tra cứu thương mại (đơn, gói đã cấp, giao dịch
 * ngân hàng) trên BMT API.
 */

/** Thời điểm UTC từ API → giờ máy người xem. */
export function stamp(value?: string | null): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '—'
}

/** Số tiền API trả dạng chuỗi số nguyên VND. */
export function useVnd() {
  const locale = useLocale() as Locale
  return (value?: string | number | null) => {
    if (value === undefined || value === null || value === '') return '—'
    const amount = Number(value)
    return Number.isFinite(amount) ? formatCurrency(amount, locale) : String(value)
  }
}

export type DateRange = [Dayjs | null, Dayjs | null] | null

/** Khoảng ngày → `fromUtc` (tính cả mốc) / `toUtc` (không tính mốc, nên cộng 1 ngày). */
export function rangeToUtc(range: DateRange): { fromUtc?: string; toUtc?: string } {
  const [from, to] = range ?? [null, null]
  return {
    fromUtc: from ? from.startOf('day').toISOString() : undefined,
    toUtc: to ? to.add(1, 'day').startOf('day').toISOString() : undefined
  }
}

export function DateRangeFilter({
  value,
  onChange,
  fromLabel,
  toLabel
}: {
  value: DateRange
  onChange: (next: DateRange) => void
  fromLabel: string
  toLabel: string
}) {
  return (
    <DatePicker.RangePicker
      value={value}
      onChange={(next) => onChange(next as DateRange)}
      format='DD/MM/YYYY'
      allowEmpty={[true, true]}
      placeholder={[fromLabel, toLabel]}
    />
  )
}

/** Nhãn loại gói / lựa chọn mua dùng chung. */
export function useCommerceLabels() {
  const t = useTranslations('admin.bmtCommerce')
  return {
    kind: (value: 'Design' | 'Supervision') => t(`kinds.${value}`),
    offer: (value: 'Month' | 'Year' | 'ConstructionSite') => t(`offerKeys.${value}`)
  }
}
