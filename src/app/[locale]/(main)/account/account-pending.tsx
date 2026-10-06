'use client'

import { Clock3 } from 'lucide-react'
import { useTranslations } from 'next-intl'

/**
 * Trạng thái "chưa có / đang phát triển" cho các mục Tài khoản mà backend chưa
 * có API (Lịch tư vấn, Hồ sơ thi công). Hiện thay cho dữ liệu mock để không gây
 * hiểu nhầm là đã chạy thật.
 */
export function AccountPending() {
  const t = useTranslations('account.pending')
  return (
    <div className='bg-card rounded-xl border px-6 py-14 text-center'>
      <Clock3 className='text-primary mx-auto size-8' strokeWidth={1.5} />
      <p className='mt-3 font-semibold'>{t('title')}</p>
      <p className='text-muted-foreground mx-auto mt-1 max-w-md text-sm text-pretty'>{t('description')}</p>
    </div>
  )
}
