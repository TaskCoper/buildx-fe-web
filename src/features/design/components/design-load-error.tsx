'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/shared/components/ui/button'

/** Thử đọc lại dữ liệu; không tạo dự toán hoặc gửi lại AI. */
export function DesignLoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('design.estimateApi.load')
  return (
    <div role='alert' className='bg-card space-y-3 rounded-xl border p-6 text-center'>
      <p className='text-muted-foreground text-sm'>{t('error')}</p>
      <Button variant='outline' onClick={onRetry}>
        {t('retry')}
      </Button>
    </div>
  )
}
