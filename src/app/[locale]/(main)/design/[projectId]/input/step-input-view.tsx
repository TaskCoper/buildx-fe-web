'use client'

import { useTranslations } from 'next-intl'

import {
  StepInputApiForm,
  StepInputForm,
  StepInputPipelineForm,
  StepProgress,
  usePipelineSteps
} from '@/features/design'
import { env } from '@/shared/config/env'
import { useRouter } from '@/i18n/navigation'
import { designEstimateRoute, designPlanRoute } from '@/shared/constants/routes'

/** Bước 1 — tiêu đề + stepper + form nhập liệu; submit chuyển sang Bước 2 (luồng cũ) hoặc chặng Bản vẽ 2D. */
export function StepInputView({ projectId }: { projectId: string }) {
  if (env.NEXT_PUBLIC_ESTIMATE_PIPELINE_ENABLED && !env.NEXT_PUBLIC_USE_MOCK_API)
    return <PipelineInputView projectId={projectId} />
  return <LegacyInputView projectId={projectId} />
}

function LegacyInputView({ projectId }: { projectId: string }) {
  const router = useRouter()
  const t = useTranslations('design.input')

  return (
    <>
      <StepProgress current={1} title={t('pageTitle')} entranceKey={`design.${projectId}.step1`} />
      {!env.NEXT_PUBLIC_USE_MOCK_API ? (
        <StepInputApiForm projectId={projectId} onSubmit={() => router.push(designEstimateRoute(projectId))} />
      ) : (
        <StepInputForm projectId={projectId} onSubmit={() => router.push(designEstimateRoute(projectId))} />
      )}
    </>
  )
}

/** Luồng bốn chặng: thanh tiến trình năm bước; bấm chạy chặng 2D xong thì sang màn Bản vẽ 2D. */
function PipelineInputView({ projectId }: { projectId: string }) {
  const router = useRouter()
  const t = useTranslations('design.input')
  const steps = usePipelineSteps(projectId, 1)

  return (
    <>
      <StepProgress
        pipeline={{ current: steps.current, states: steps.states }}
        title={t('pageTitle')}
        entranceKey={`design.${projectId}.step1`}
      />
      <StepInputPipelineForm projectId={projectId} onStageStarted={() => router.push(designPlanRoute(projectId))} />
    </>
  )
}
