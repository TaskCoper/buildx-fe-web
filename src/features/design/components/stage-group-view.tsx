'use client'

import { ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

import { Link } from '@/i18n/navigation'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { designDossierRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { useStageGroupRun } from '../hooks/use-stage-group-run'
import { useStages } from '../hooks/use-stages'
import { stageGroupActions, stageOf, type StageStatus } from '../services/pipeline.logic'
import { EstimateStageView } from './estimate-stage-view'
import { Render3dStageView } from './render3d-stage-view'

export type StageGroupTab = 'estimate' | 'render3d'

/**
 * Bước Dự toán & 3D (BR-PROJ-010 khoản 2–4, 10; STORY-PROJ-003, 008, 009): hai chặng chạy cùng lúc, xem trên một màn hai
 * tab. Thanh thao tác chung có Đi tiếp (lần đầu), Thử lại (chạy lại các chặng đang lỗi, kể cả khi chặng kia còn chạy) và
 * Sang bước Hồ sơ (cả hai xong). Mỗi tab hiện kết quả ngay khi chặng của tab xong. `waitingPanel` là mẫu thư viện do lớp
 * app ghép vào khi có chặng đang chạy (BR-LIB-001 khoản 16).
 */
export function StageGroupView({
  projectId,
  tab,
  onTabChange,
  waitingPanel
}: {
  projectId: string
  tab: StageGroupTab
  onTabChange: (tab: StageGroupTab) => void
  waitingPanel?: ReactNode
}) {
  const t = useTranslations('design.pipeline.group')
  const stages = useStages(projectId)
  const estimate = stageOf(stages.data, 'Estimate')
  const render3d = stageOf(stages.data, 'Render3d')
  const actions = stageGroupActions(estimate, render3d)
  const run = useStageGroupRun(projectId)

  const start = async () => {
    if (run.isPending) return
    try {
      await run.mutateAsync()
    } catch (error) {
      const kind = run.kindOf(error)
      if (kind !== 'inProgress' && kind !== 'alreadySucceeded') toast.error(run.messageOf(error))
    }
  }

  return (
    <div className='space-y-6'>
      <section
        aria-live='polite'
        className='bg-card flex flex-col gap-4 rounded-2xl border p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between'
      >
        <div className='flex flex-wrap gap-2'>
          <StatusChip label={t('tabs.estimate')} status={estimate?.status} />
          <StatusChip label={t('tabs.render3d')} status={render3d?.status} />
        </div>
        <div className='flex flex-col items-start gap-2 sm:items-end'>
          {actions.next ? (
            <>
              <Button onClick={() => void start()} disabled={run.isPending}>
                {run.isPending ? <Loader2 className='size-4 animate-spin' /> : <ArrowRight className='size-4' />}
                {t('next')}
              </Button>
              <p className='text-muted-foreground text-xs'>{t('nextHint')}</p>
            </>
          ) : null}
          {actions.retry ? (
            <>
              <Button onClick={() => void start()} disabled={run.isPending}>
                {run.isPending ? <Loader2 className='size-4 animate-spin' /> : <RefreshCw className='size-4' />}
                {t('retry')}
              </Button>
              <p className='text-muted-foreground text-xs'>{t('retryHint')}</p>
            </>
          ) : null}
          {actions.contactSupport ? <p className='text-destructive text-sm'>{t('contactSupport')}</p> : null}
          {actions.toDossier ? (
            <Button asChild>
              <Link href={designDossierRoute(projectId)}>
                {t('toDossier')}
                <ArrowRight className='size-4' />
              </Link>
            </Button>
          ) : !actions.next ? (
            <p className='text-muted-foreground text-xs'>{t('dossierWaiting')}</p>
          ) : null}
        </div>
      </section>

      <Tabs value={tab} onValueChange={(value) => onTabChange(value as StageGroupTab)} className='gap-4'>
        <TabsList aria-label={t('pageTitle')} className='h-auto w-full sm:w-fit'>
          <TabsTrigger value='estimate' className='px-4 py-1.5'>
            {t('tabs.estimate')}
          </TabsTrigger>
          <TabsTrigger value='render3d' className='px-4 py-1.5'>
            {t('tabs.render3d')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value='estimate'>
          <EstimateStageView projectId={projectId} embedded />
        </TabsContent>
        <TabsContent value='render3d'>
          <Render3dStageView key={projectId} projectId={projectId} embedded />
        </TabsContent>
      </Tabs>

      {waitingPanel}
    </div>
  )
}

function StatusChip({ label, status }: { label: string; status: StageStatus | undefined }) {
  const t = useTranslations('design.pipeline.group.status')
  const value = status ?? 'Locked'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm',
        value === 'Succeeded' && 'border-primary/40 text-primary',
        value === 'Failed' && 'border-destructive/40 text-destructive',
        (value === 'Running' || value === 'Queued') && 'border-primary/30'
      )}
    >
      {value === 'Running' || value === 'Queued' ? <Loader2 className='size-3.5 animate-spin' /> : null}
      <span className='font-medium'>{label}</span>
      <span className='text-muted-foreground'>· {t(value)}</span>
    </span>
  )
}
