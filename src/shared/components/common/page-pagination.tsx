'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface PagePaginationProps {
  /** Trang đang xem, đếm từ 1. */
  page: number
  pageCount: number
  onChange: (page: number) => void
  /** Khóa nút khi đang tải trang khác. */
  disabled?: boolean
  className?: string
}

/**
 * Các số trang cần hiện: luôn có trang đầu, trang cuối và hai trang quanh trang đang xem; chỗ hở thay bằng `null`
 * (dấu "…"). Ít trang thì hiện hết. Tách riêng để kiểm bằng ví dụ.
 */
export function pageWindow(page: number, pageCount: number): Array<number | null> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1)
  const wanted = new Set([1, pageCount, page - 1, page, page + 1])
  if (page <= 3) [2, 3, 4].forEach((value) => wanted.add(value))
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((value) => wanted.add(value))
  const numbers = [...wanted].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b)
  return numbers.flatMap((value, index) => {
    const previous = numbers[index - 1]
    return previous !== undefined && value - previous > 1 ? [null, value] : [value]
  })
}

/**
 * Phân trang theo số cho danh sách lấy từng trang từ BE (Tài khoản: Dự án, Hồ sơ, Lịch sử mua). Dựng bằng `Button`
 * thay vì primitive `Pagination` vì primitive đó là link và cố định chữ tiếng Anh. Chỉ một trang thì không hiện gì.
 */
export function PagePagination({ page, pageCount, onChange, disabled = false, className }: PagePaginationProps) {
  const t = useTranslations('common.pagination')
  if (pageCount <= 1) return null

  return (
    <nav aria-label={t('label')} className={cn('flex flex-wrap items-center justify-center gap-1', className)}>
      <Button
        variant='ghost'
        size='icon'
        className='text-muted-foreground size-8'
        aria-label={t('previous')}
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className='size-4' />
      </Button>

      {pageWindow(page, pageCount).map((value, index) =>
        value === null ? (
          <span key={`gap-${index}`} aria-hidden className='text-muted-foreground w-6 text-center text-[13px]'>
            …
          </span>
        ) : (
          <Button
            key={value}
            variant={value === page ? 'outline' : 'ghost'}
            size='icon'
            className={cn('size-8 text-[13px]', value === page && 'border-primary/50 text-primary font-semibold')}
            aria-label={t('page', { page: value })}
            aria-current={value === page ? 'page' : undefined}
            disabled={disabled && value !== page}
            onClick={() => onChange(value)}
          >
            {value}
          </Button>
        )
      )}

      <Button
        variant='ghost'
        size='icon'
        className='text-muted-foreground size-8'
        aria-label={t('next')}
        disabled={disabled || page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className='size-4' />
      </Button>
    </nav>
  )
}
