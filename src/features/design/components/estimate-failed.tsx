'use client'

import { AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Link } from '@/i18n/navigation'
import { Button } from '@/shared/components/ui/button'
import { designInputRoute } from '@/shared/constants/routes'
import { useStartGeneration, startErrorKind } from '../hooks/use-start-generation'
import { failureKind } from '../services/estimate-result.logic'

interface EstimateFailedProps {
  projectId: string
  failureCode?: string | null
  /** Sau khi gửi lại AI thành công (hoặc tác vụ đã chạy): đọc lại trạng thái để màn chờ chạy tiếp. */
  onRetried: () => void
}

/**
 * Bước 2 khi tác vụ AI thất bại (BR-PROJ-005): nói rõ lý do, cho sửa thông tin hoặc chủ động thử lại cùng bản dự toán
 * (mỗi lần thử lại kiểm lại dữ liệu, quyền và lượt). Thất bại không để khách mất dữ liệu đã nhập.
 */
export function EstimateFailed({ projectId, failureCode, onRetried }: EstimateFailedProps) {
  const t = useTranslations('design.estimateApi.failure')
  const start = useStartGeneration(projectId)

  function retry() {
    start.mutate(undefined, {
      onSuccess: onRetried,
      onError: (error) => {
        if (startErrorKind(error) === 'alreadyRunning') {
          onRetried()
          return
        }
        toast.error(start.messageOf(error))
      }
    })
  }

  return (
    <section className='bg-card flex flex-col items-center gap-4 rounded-2xl border p-8 text-center'>
      <span className='bg-destructive/10 text-destructive flex size-16 items-center justify-center rounded-full'>
        <AlertCircle className='size-8' strokeWidth={2} />
      </span>
      <div className='space-y-1.5'>
        <h2 className='text-xl font-semibold'>{t('title')}</h2>
        <p className='text-muted-foreground mx-auto max-w-md text-sm text-pretty'>{t(failureKind(failureCode))}</p>
      </div>
      <div className='flex flex-wrap justify-center gap-2'>
        <Button onClick={retry} disabled={start.isPending}>
          {start.isPending ? <Loader2 className='size-4 animate-spin' /> : <RotateCcw className='size-4' />}
          {t('retry')}
        </Button>
        <Button asChild variant='outline'>
          <Link href={designInputRoute(projectId)}>{t('edit')}</Link>
        </Button>
      </div>
    </section>
  )
}
