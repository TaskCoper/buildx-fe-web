'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import {
  Plan2dStageView,
  StepProgress,
  displayProjectId,
  useEstimateDetailName,
  usePipelineSteps
} from '@/features/design'
import { useRouter } from '@/i18n/navigation'
import { env } from '@/shared/config/env'
import { designInputRoute } from '@/shared/constants/routes'

/** Màn chặng Bản vẽ 2D. Luồng bốn chặng chưa bật thì quay về Bước 1 của luồng cũ. */
export function StepPlanView({ projectId }: { projectId: string }) {
  const t = useTranslations('design.pipeline.plan')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const enabled = env.NEXT_PUBLIC_ESTIMATE_PIPELINE_ENABLED && !env.NEXT_PUBLIC_USE_MOCK_API
  const steps = usePipelineSteps(projectId, 2)
  const estimate = useEstimateDetailName(projectId)

  useEffect(() => {
    if (!enabled) router.replace(designInputRoute(projectId))
  }, [enabled, projectId, router])
  if (!enabled) return null

  return (
    <>
      <StepProgress
        pipeline={{ current: steps.current, states: steps.states }}
        title={
          estimate
            ? t('pageTitleWithProject', { name: estimate.name, id: displayProjectId(projectId, estimate.code) })
            : t('pageTitle')
        }
        previousStep={{ href: designInputRoute(projectId), label: tCommon('back') }}
        entranceKey={`design.${projectId}.plan`}
      />
      <div className='mx-auto w-full max-w-[90rem] px-4 pt-2 pb-10 lg:px-8'>
        <Plan2dStageView projectId={projectId} />
      </div>
    </>
  )
}
