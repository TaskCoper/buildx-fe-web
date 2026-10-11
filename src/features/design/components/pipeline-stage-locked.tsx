'use client'

import { Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { Button } from '@/shared/components/ui/button'
import { designPlanRoute } from '@/shared/constants/routes'

/**
 * Chặng chưa mở trong luồng bốn chặng. Đợt 1 mới có chặng Bản vẽ 2D, nên Dự toán, Phối cảnh 3D và Hồ sơ hiện thông báo
 * này thay cho màn của luồng cũ (TDD-PROJ-006, `EnabledStages`).
 */
export function PipelineStageLocked({ projectId }: { projectId: string }) {
  const t = useTranslations('design.pipeline.locked')
  return (
    <section className='bg-card mx-auto flex max-w-xl flex-col items-center gap-3 rounded-2xl border p-8 text-center shadow-xs'>
      <Lock className='text-muted-foreground size-6' />
      <h2 className='text-lg font-semibold'>{t('title')}</h2>
      <p className='text-muted-foreground text-sm text-pretty'>{t('description')}</p>
      <Button asChild variant='outline' className='mt-2'>
        <Link href={designPlanRoute(projectId)}>{t('backToPlan')}</Link>
      </Button>
    </section>
  )
}
