'use client'

import { useTranslations } from 'next-intl'

import {
  StageGroupView,
  StepProgress,
  displayProjectId,
  useEstimateDetailName,
  useMatchCriteria,
  usePipelineSteps,
  waitingTemplateKind,
  type StageGroupTab
} from '@/features/design'
import { PersonalizedPanel, useHandbookPanelStore } from '@/features/handbook'
import { designPlanRoute } from '@/shared/constants/routes'
import { useSearchParamState } from '@/shared/hooks'

const STAGE_GROUP_TABS: readonly StageGroupTab[] = ['estimate', 'render3d']

/**
 * Bước Dự toán & 3D của luồng bốn chặng (BR-PROJ-010 sửa 13/10/2026, STORY-PROJ-003/008/009): Dự toán và Phối cảnh 3D chạy
 * cùng lúc, xem trên một màn hai tab (`?tab=estimate|render3d`). Khi có chặng đang chạy, màn hiện mẫu 3D tham khảo của
 * thư viện (BR-LIB-001 khoản 16). Trang chỉ dùng màn này khi bật `NEXT_PUBLIC_ESTIMATE_PIPELINE_ENABLED`.
 */
export function StepEstimateStageView({ projectId }: { projectId: string }) {
  const t = useTranslations('design.pipeline.group')
  const tCommon = useTranslations('common')
  const steps = usePipelineSteps(projectId, 3)
  const estimate = useEstimateDetailName(projectId)
  const criteria = useMatchCriteria(projectId)
  const panelMinimized = useHandbookPanelStore((s) => s.minimized)
  // Đổi tab không điều hướng (xem `useSearchParamState`): trên trang ISR, `router.replace` sang `?tab=` khác có lúc bị bỏ
  // qua ở bản production nên tab đứng yên, và mỗi lần đổi còn tải lại payload trang.
  const [tab, setTab] = useSearchParamState('tab', STAGE_GROUP_TABS, 'estimate')
  const waiting = waitingTemplateKind(steps.stages.data) === '3d'

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
        <StageGroupView
          projectId={projectId}
          tab={tab}
          onTabChange={setTab}
          waitingPanel={
            waiting ? (
              <PersonalizedPanel filter={{}} kind='3d' topic='interior' matchCriteria={criteria} matchedOnly />
            ) : undefined
          }
          waitingPanelCollapsed={panelMinimized}
        />
      </div>
    </>
  )
}
