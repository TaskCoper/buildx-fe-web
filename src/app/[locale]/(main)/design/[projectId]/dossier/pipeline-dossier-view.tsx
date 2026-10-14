'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link } from '@/i18n/navigation'
import { useAuth } from '@/shared/auth'
import { Button } from '@/shared/components/ui/button'
import { designEstimateRoute } from '@/shared/constants/routes'
import {
  estimatePipelineApi,
  designKeys,
  useStageRun,
  isStageActive,
  dossierAutoKey,
  dossierAutoStart,
  stageOf,
  dossierEstimate,
  StageRunProgress,
  StageStateCard,
  type DossierImages,
  DossierReady,
  StepProgress,
  useEstimateProjectInfo,
  useProject,
  usePipelineSteps,
  useDossier,
  useCreateShareLink,
  useRevokeShareLink,
  useSendDossierEmail
} from '@/features/design'

export function PipelineDossierView({ projectId }: { projectId: string }) {
  const t = useTranslations('design.pipeline.dossier')
  const td = useTranslations('design.dossier')
  const steps = usePipelineSteps(projectId, 4)
  const stage = stageOf(steps.stages.data, 'Dossier')
  const done = stage?.status === 'Succeeded'
  const busy = isStageActive(stage?.status)
  const failed = stage?.status === 'Failed'
  const available = !!stage && stage.status !== 'Locked'
  const { user } = useAuth()
  const project = useProject(projectId)
  const info = useEstimateProjectInfo(projectId)
  const client = useQueryClient()
  const dossier = useDossier(projectId, { enabled: done })
  const sources = useQuery({
    queryKey: [...designKeys.all, projectId, 'dossier-sources'],
    enabled: available,
    queryFn: async ({ signal }) => {
      const [estimate, plan, render] = await Promise.all([
        estimatePipelineApi.getEstimateResult(projectId, signal),
        estimatePipelineApi.getPlan2dResult(projectId, signal),
        estimatePipelineApi.getRender3dResult(projectId, signal)
      ])
      const hero =
        render.items.find((item) => item.itemKey === 'exterior_day') ?? render.items.find((item) => item.fileUrl)
      const image = (url?: string | null) => (url ? estimatePipelineApi.fileHref(url) : null)
      const images: DossierImages = {
        cover: image(hero?.fileUrl),
        perspective: image(hero?.fileUrl),
        floorPlan: image(plan.drawings[0]?.fileUrl)
      }
      return { estimate: dossierEstimate(projectId, estimate), images, quoteDate: estimate.estimateDateVn }
    }
  })
  const run = useStageRun(projectId, 'Dossier')
  const create = useCreateShareLink(projectId)
  const revoke = useRevokeShareLink(projectId)
  const email = useSendDossierEmail(projectId)
  useEffect(() => {
    if (!done) return
    void client.invalidateQueries({ queryKey: designKeys.dossier(projectId) })
    void client.invalidateQueries({ queryKey: designKeys.projects() })
  }, [done, client, projectId])
  // Hồ sơ tự tạo khi khách vào bước này lần đầu (BR-PROJ-010 khoản 4, TDD-PROJ-011): khóa cố định nên tải lại trang hay
  // mở hai tab chỉ tạo một lần chạy. Lần chạy trước đã lỗi thì không tự chạy lại; khách bấm Chạy lại.
  const [autoPending, setAutoPending] = useState(false)
  const autoTried = useRef(false)
  const [autoRejected, setAutoRejected] = useState(false)
  useEffect(() => {
    if (autoTried.current || !dossierAutoStart(stage, autoPending)) return
    autoTried.current = true
    setAutoPending(true)
    estimatePipelineApi
      .startRun(projectId, 'Dossier', undefined, dossierAutoKey(projectId))
      .catch((error: unknown) => {
        if (['inProgress', 'alreadySucceeded'].includes(run.kindOf(error))) return
        setAutoRejected(true)
        toast.error(run.messageOf(error))
      })
      .finally(() => {
        setAutoPending(false)
        void client.invalidateQueries({ queryKey: designKeys.stages(projectId) })
      })
  }, [stage, autoPending, projectId, run, client])
  const start = async () => {
    if (run.isPending || busy || autoPending) return
    try {
      await run.mutateAsync(undefined)
    } catch (error) {
      if (!['inProgress', 'alreadySucceeded'].includes(run.kindOf(error))) toast.error(run.messageOf(error))
    }
  }
  const projectInfo = {
    projectId,
    projectCode: project.data?.code,
    projectName: project.data?.name ?? '',
    customerName: user?.name ?? '',
    phone: user?.phone ?? '',
    address: info?.address ?? '',
    createdAt: sources.data?.quoteDate ?? project.data?.createdAt ?? '',
    buildingTypeLabel: info?.buildingTypeLabel ?? '',
    scaleLabel: info?.scaleLabel ?? '',
    floorArea: sources.data?.estimate.estimatedFloorArea ?? 0,
    packageLabel: info?.packageLabel ?? '',
    styleLabel: info?.styleLabel ?? ''
  }
  // Tự tạo bị từ chối mà chặng vẫn Sẵn sàng thì cũng coi như lỗi để khách bấm Thử lại, tránh xoay mãi.
  const autoFailed = autoRejected && stage?.status === 'Ready'
  const failedNow = (failed || run.isError || autoFailed) && !busy && !run.isPending && !autoPending
  const error = steps.stages.isError || sources.isError || project.isError || (done && dossier.isError)
  return (
    <>
      <StepProgress
        pipeline={{ current: 4, states: steps.states }}
        title={td('pageTitle')}
        currentDone={done}
        previousStep={{ href: designEstimateRoute(projectId), label: t('back') }}
        animateEntrance={false}
      />
      {error ? (
        <div role='alert' className='mx-auto max-w-xl space-y-4 rounded-xl border p-6'>
          <p>{t('loadError')}</p>
          <Button
            onClick={() => {
              void steps.stages.refetch()
              void sources.refetch()
              void project.refetch()
              if (done) void dossier.refetch()
            }}
          >
            {t('reload')}
          </Button>
        </div>
      ) : stage?.status === 'Locked' ? (
        <StageStateCard icon={<Lock />} title={t('locked')}>
          <Button asChild variant='outline'>
            <Link href={designEstimateRoute(projectId)}>{t('back')}</Link>
          </Button>
        </StageStateCard>
      ) : !available || sources.isPending || project.isPending || (done && dossier.isPending) ? (
        <div className='flex min-h-64 items-center justify-center'>
          <Loader2 className='size-6 animate-spin' aria-label={t('loading')} />
        </div>
      ) : done && dossier.data?.status === 'ready' ? (
        <DossierReady
          dossier={dossier.data}
          result={sources.data?.estimate}
          info={projectInfo}
          advisory={[sources.data?.estimate.advisory ?? '']}
          animateCompletion={run.isSuccess}
          onRequestShareLink={() => undefined}
          onCreateLink={async (date) => {
            await create.mutateAsync(date)
          }}
          onRevokeLink={async () => {
            if (dossier.data?.shareToken) await revoke.mutateAsync(dossier.data.shareToken)
          }}
          onSendEmail={async (address) => {
            const outcome = await email.mutateAsync(address)
            if (outcome === 'unknown') toast.warning(td('share.email.unknown', { email: address }))
            else toast.success(td('share.email.sent', { email: address }))
            return outcome
          }}
        />
      ) : (
        // Đang dựng hồ sơ chỉ hiện tiến độ, không kèm mẫu thư viện; lỗi thì báo và cho chạy lại ngay trên thẻ này.
        <div className='mx-auto w-full max-w-[90rem] px-4 pt-2 pb-10 lg:px-8'>
          <StageStateCard
            icon={
              failedNow ? (
                <AlertCircle className='text-destructive size-6' />
              ) : (
                <Loader2 className='text-primary size-6 animate-spin' />
              )
            }
            title={t(failedNow ? 'failed' : 'running')}
            description={t(failedNow ? 'failureHint' : 'noQuota')}
          >
            <div className='w-full space-y-3' aria-live='polite'>
              {failedNow ? (
                <Button onClick={() => void start()} disabled={run.isPending}>
                  {t('retry')}
                </Button>
              ) : (
                <StageRunProgress
                  progress={stage?.progress}
                  progressText={t('progress', { done: stage?.progress?.done ?? 0, total: 4 })}
                />
              )}
            </div>
          </StageStateCard>
        </div>
      )}
    </>
  )
}
