'use client'

import { useTranslations } from 'next-intl'

import { StepInputApiForm, StepInputForm, StepProgress } from '@/features/design'
import { env } from '@/shared/config/env'
import { useRouter } from '@/i18n/navigation'
import { designEstimateRoute } from '@/shared/constants/routes'

/** Bước 1 — tiêu đề + stepper + form nhập liệu; submit chuyển sang Bước 2. */
export function StepInputView({ projectId }: { projectId: string }) {
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
