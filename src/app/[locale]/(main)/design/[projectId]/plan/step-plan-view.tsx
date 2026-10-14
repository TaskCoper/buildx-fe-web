'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import {
  Plan2dStageView,
  StepProgress,
  displayProjectId,
  useEstimateDetailName,
  useMatchCriteria,
  usePipelineSteps,
  waitingTemplateKind
} from '@/features/design'
import { PersonalizedPanel, useHandbookPanelStore } from '@/features/handbook'
import { useRouter } from '@/i18n/navigation'
import { env } from '@/shared/config/env'
import { designInputRoute } from '@/shared/constants/routes'

/**
 * Màn chặng Bản vẽ 2D. Trong lúc chặng chạy, hiện mẫu 2D tham khảo của thư viện (BR-LIB-001 khoản 16). Luồng bốn chặng
 * chưa bật thì quay về Bước 1 của luồng cũ.
 */
export function StepPlanView({ projectId }: { projectId: string }) {
  const t = useTranslations('design.pipeline.plan')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const enabled = env.NEXT_PUBLIC_ESTIMATE_PIPELINE_ENABLED && !env.NEXT_PUBLIC_USE_MOCK_API
  const steps = usePipelineSteps(projectId, 2)
  const estimate = useEstimateDetailName(projectId)
  const criteria = useMatchCriteria(projectId)
  const panelMinimized = useHandbookPanelStore((s) => s.minimized)
  const waiting = waitingTemplateKind(steps.stages.data) === '2d'

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
        <Plan2dStageView
          projectId={projectId}
          waitingPanel={
            waiting ? (
              <PersonalizedPanel filter={{}} kind='2d' topic='architecture' matchCriteria={criteria} matchedOnly />
            ) : undefined
          }
          waitingPanelCollapsed={panelMinimized}
        />
      </div>
    </>
  )
}
