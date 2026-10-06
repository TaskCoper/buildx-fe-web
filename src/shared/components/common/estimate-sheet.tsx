import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { cn } from '@/shared/lib/utils'
import { formatCurrency } from '@/shared/utils'

/** Tỷ trọng minh họa của 3 phần, khớp với số mẫu ở khung dự toán trang chủ. */
const ROWS = [
  { key: 'structure', width: '100%' },
  { key: 'finishing', width: '55%' },
  { key: 'interior', width: '45%' }
] as const

/** Tổng minh họa — bằng tổng 3 phần ở khung dự toán mẫu trên trang chủ. */
const SAMPLE_TOTAL = 2_400_000_000

interface EstimateSheetProps {
  className?: string
  /** Tổng dự toán thật. Bỏ trống thì dùng số mẫu của khung minh họa trang chủ. */
  total?: number
  /** Tỷ trọng % của 3 phần, theo thứ tự thô → hoàn thiện → nội thất. */
  percents?: [number, number, number]
}

/**
 * Bảng dự toán chi tiết — thẻ xem trước ở Bước 3 (mục III.4a) và khung minh
 * họa trang chủ. Dựng bằng markup nên đúng nội dung nó minh họa.
 */
export function EstimateSheet({ className, total, percents }: EstimateSheetProps) {
  const t = useTranslations('design.estimate')
  const locale = useLocale() as Locale

  // Vạch dài nhất luôn đầy khung để tỷ lệ giữa 3 phần vẫn đọc được ở cỡ thumbnail.
  const widths = percents
    ? percents.map((percent) => `${Math.round((percent / Math.max(...percents)) * 100)}%`)
    : ROWS.map((row) => row.width)

  return (
    <div
      className={cn('bg-card flex flex-col gap-[6%] overflow-hidden p-[9%] [container-type:inline-size]', className)}
    >
      <p className='text-[clamp(0.5rem,4cqw,0.85rem)] font-semibold'>{t('title')}</p>

      <div className='flex-1 space-y-[6%]'>
        {ROWS.map((row, index) => (
          <div key={row.key} className='space-y-[3%]'>
            <p className='text-muted-foreground text-[clamp(0.4rem,3cqw,0.7rem)]'>{t(`sections.${row.key}`)}</p>
            <div className='bg-muted h-[clamp(3px,2cqw,7px)] w-full overflow-hidden rounded-full'>
              <div className='bg-primary h-full rounded-full' style={{ width: widths[index] }} />
            </div>
            {/* Dòng hạng mục con, thu nhỏ thành vạch xám. */}
            <div className='space-y-[2px] pt-[2%]'>
              <div className='bg-muted h-[2px] w-[85%] rounded-full' />
              <div className='bg-muted h-[2px] w-[70%] rounded-full' />
            </div>
          </div>
        ))}
      </div>

      <div className='flex items-baseline justify-between border-t pt-[4%]'>
        <span className='text-muted-foreground text-[clamp(0.4rem,3cqw,0.7rem)]'>{t('grandTotal')}</span>
        <span className='text-primary text-[clamp(0.5rem,3.6cqw,0.8rem)] font-semibold'>
          {formatCurrency(total ?? SAMPLE_TOTAL, locale)}
        </span>
      </div>
    </div>
  )
}
