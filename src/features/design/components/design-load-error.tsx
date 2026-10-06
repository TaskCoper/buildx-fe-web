'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/shared/components/ui/button'
import { isApiError } from '@/shared/lib/api'

/**
 * Thử đọc lại dữ liệu; không tạo dự toán hoặc gửi lại AI. Có `error` từ API thì nói đúng nguyên nhân (không tìm thấy,
 * mất kết nối, hệ thống bận…) thay vì một câu chung.
 */
export function DesignLoadError({ onRetry, error }: { onRetry: () => void; error?: unknown }) {
  const t = useTranslations('design.estimateApi.load')
  return (
    <div role='alert' className='bg-card space-y-3 rounded-xl border p-6 text-center'>
      <p className='text-muted-foreground text-sm'>{isApiError(error) && error.message ? error.message : t('error')}</p>
      <Button variant='outline' onClick={onRetry}>
        {t('retry')}
      </Button>
    </div>
  )
}
