'use client'

import { useTranslations } from 'next-intl'

import {
  EstimateStageView,
  StepProgress,
  displayProjectId,
  useEstimateDetailName,
  usePipelineSteps
} from '@/features/design'
import { designPlanRoute } from '@/shared/constants/routes'

/**
 * Màn chặng Dự toán của luồng bốn chặng (STORY-PROJ-008, TDD-PROJ-009 mục P), thay cho thông báo "Chặng này chưa mở"
 * của đợt 1. Trang chỉ dùng màn này khi bật `NEXT_PUBLIC_ESTIMATE_PIPELINE_ENABLED`; tắt cờ thì giữ màn Bước 2 cũ.
 */
export function StepEstimateStageView({ projectId }: { projectId: string }) {
  const t = useTranslations('design.pipeline.estimate')
  const tCommon = useTranslations('common')
  const steps = usePipelineSteps(projectId, 3)
  const estimate = useEstimateDetailName(projectId)

  return (
    <>
      <StepProgress
        pipeline={{ current: steps.current, states: steps.states }}
        title={
          estimate
            ? t('pageTitleWithProject', { name: estimate.name, id: displayProjectId(projectId, estimate.code) })
            : t('pageTitle')
        }
        previousStep={{ href: designPlanRoute(projectId), label: tCommon('back') }}
        entranceKey={`design.${projectId}.estimate-stage`}
      />
      <div className='mx-auto w-full max-w-[90rem] px-4 pt-2 pb-10 lg:px-8'>
        <EstimateStageView projectId={projectId} />
      </div>
    </>
  )
}
