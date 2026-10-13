'use client'
import { useTranslations } from 'next-intl'
import {
  Render3dStageView,
  StepProgress,
  displayProjectId,
  useEstimateDetailName,
  usePipelineSteps
} from '@/features/design'
import { designEstimateRoute } from '@/shared/constants/routes'
export function StepRender3dView({ projectId }: { projectId: string }) {
  const t = useTranslations('design.pipeline.render3d')
  const steps = usePipelineSteps(projectId, 4)
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
        previousStep={{ href: designEstimateRoute(projectId), label: t('back') }}
        entranceKey={`design.${projectId}.render3d`}
      />
      <div className='mx-auto w-full max-w-[90rem] px-4 pt-2 pb-10 lg:px-8'>
        <Render3dStageView key={projectId} projectId={projectId} />
      </div>
    </>
  )
}
