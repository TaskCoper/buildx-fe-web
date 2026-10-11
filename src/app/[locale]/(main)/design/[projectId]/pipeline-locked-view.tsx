'use client'

import { useTranslations } from 'next-intl'

import { PipelineStageLocked, StepProgress, usePipelineSteps, type PipelineStep } from '@/features/design'

/**
 * Luồng bốn chặng bật mà khách mở màn Dự toán / Hồ sơ của luồng cũ: đợt 1 chưa có các chặng này, hiện thông báo chưa
 * mở thay cho màn cũ (màn cũ đọc kết quả `mock-v1`, không đúng với bản dự toán của luồng mới).
 */
export function PipelineLockedView({ projectId, step }: { projectId: string; step: Extract<PipelineStep, 3 | 5> }) {
  const t = useTranslations('design.pipeline.locked')
  const steps = usePipelineSteps(projectId, step)
  return (
    <>
      <StepProgress
        pipeline={{ current: steps.current, states: steps.states }}
        title={t(`pageTitle.${step}`)}
        entranceKey={`design.${projectId}.locked.${step}`}
      />
      <div className='mx-auto w-full max-w-[90rem] px-4 pt-2 pb-10 lg:px-8'>
        <PipelineStageLocked projectId={projectId} />
      </div>
    </>
  )
}
