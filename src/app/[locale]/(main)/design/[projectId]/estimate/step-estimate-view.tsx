'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

import {
  DesignStepLayout,
  EstimateFailed,
  EstimateFlowError,
  EstimateResultView,
  GenerationWaiting,
  displayProjectId,
  DesignLoadError,
  StepProgress,
  useDesignStore,
  useEstimate,
  useFloorCountLabel,
  useMatchCriteria,
  useProject
} from '@/features/design'
import { ProactiveChatStream } from '@/features/chatbot'
import { PersonalizedPanel, useHandbookPanelStore, type HandbookFilter } from '@/features/handbook'
import { useRouter } from '@/i18n/navigation'
import { useAuth } from '@/shared/auth'
import { env } from '@/shared/config/env'
import { designDossierRoute, designInputRoute, ROUTES } from '@/shared/constants/routes'
import { useProjectChatContext } from '../use-project-chat-context'

/**
 * Bước 2 (mục IV.4 + IV.5).
 *
 * Màn chờ theo Hình 07: cẩm nang cá nhân hóa chiếm cột trái rộng, cột tiến độ
 * AI hẹp bên phải. Khi render xong, màn kết quả chỉ còn nội dung dự toán; cẩm
 * nang không còn thuộc trạng thái này và được unmount hoàn toàn.
 * Lớp app dựng `HandbookFilter` từ draft vì hai feature không import lẫn nhau.
 */
export function StepEstimateView({ projectId }: { projectId: string }) {
  const t = useTranslations('design.estimate')
  const tCommon = useTranslations('common')
  const tWaiting = useTranslations('design.progress.estimate')
  const tInput = useTranslations('design.input')
  const floorLabel = useFloorCountLabel()
  const tPanel = useTranslations('handbook.panel')
  const tEntry = useTranslations('design.entry')
  const router = useRouter()
  const { user } = useAuth()
  const draft = useDesignStore((s) => s.drafts[projectId])
  const projectQuery = useProject(projectId)
  const project = projectQuery.data
  // Mẫu thư viện khớp đúng đầu vào đã gửi AI (chỉ dự toán thật); mock/chưa đủ điều kiện thì panel dùng cách cũ.
  const matchCriteria = useMatchCriteria(projectId)
  const {
    data: result,
    isSuccess,
    error: estimateError,
    refetch
  } = useEstimate(projectId, {
    readOnly: Boolean(project && project.currentStep >= 2),
    enabled: Boolean(project)
  })
  // Dự toán thật: chưa gửi AI thì về Bước 1; tác vụ thất bại thì hiện lý do + Thử lại / Sửa thông tin.
  const flowError = estimateError instanceof EstimateFlowError ? estimateError : null
  const failed = flowError?.kind === 'failed'
  const [resultVisible, setResultVisible] = useState(() => Boolean(result))
  const panelMinimized = useHandbookPanelStore((s) => s.minimized)
  const setPanelMinimized = useHandbookPanelStore((s) => s.setMinimized)
  const openedPanelForRenderRef = useRef(false)

  const filter = useMemo<HandbookFilter>(
    () => ({
      buildingType: draft?.buildingType ?? undefined,
      floorCount: draft?.floorCount ?? undefined,
      hasAttic: draft?.hasAttic ?? undefined,
      architectureStyle: draft?.style ?? undefined,
      interiorStyle: draft?.style ?? undefined
    }),
    [draft]
  )

  // Dòng ghi rõ căn cứ lọc trên panel (Phần 1.1). Nhãn nằm ở namespace của Bước 1
  // nên phải dịch tại đây rồi truyền xuống — `features/handbook` không đọc được.
  const filterLabel = useMemo(() => {
    if (!draft?.buildingType) return undefined
    return tPanel('filterLabel2d', {
      building: tInput(`buildingType.options.${draft.buildingType}`),
      scale: draft.floorCount ? floorLabel(draft.floorCount) : ''
    })
  }, [draft, tInput, tPanel, floorLabel])

  // Đầu màn kết quả (góp ý BuildX): tiêu đề kèm tên + mã dự án, dòng phụ ghi
  // địa chỉ · loại nhà · quy mô, và đường quay lại danh sách dự án.
  const resultSubtitle = useMemo(() => {
    const scale = [
      draft?.floorCount ? floorLabel(draft.floorCount) : '',
      result ? `${result.estimatedFloorArea} m²` : ''
    ]
      .filter(Boolean)
      .join(', ')
    return [draft?.address, draft?.buildingType ? tInput(`buildingType.options.${draft.buildingType}`) : '', scale]
      .filter(Boolean)
      .join(' · ')
  }, [draft, result, tInput, floorLabel])

  // Chatbox AI nói theo dữ liệu thật của dự án; tự trò chuyện trong lúc chờ.
  useProjectChatContext(project?.name ?? '', draft, result ? null : 'estimate')

  // Màn render có vòng phần trăm luôn bắt đầu với Cẩm nang đang mở. Chỉ ép mở
  // đúng một lần cho phiên render này; nếu người dùng tự thu nhỏ sau đó thì tôn
  // trọng lựa chọn của họ, không bật lại ở mỗi render.
  useEffect(() => {
    if (resultVisible || openedPanelForRenderRef.current) return
    openedPanelForRenderRef.current = true
    setPanelMinimized(false)
  }, [resultVisible, setPanelMinimized])

  useEffect(() => {
    if (flowError?.kind === 'notSubmitted') router.replace(designInputRoute(projectId))
  }, [flowError, projectId, router])

  // Khi AI sinh xong: toast "Dự toán đã sẵn sàng" (mục IV.4).
  useEffect(() => {
    if (!result || resultVisible) return
    const timer = window.setTimeout(() => setResultVisible(true), 720)
    return () => window.clearTimeout(timer)
  }, [result, resultVisible])

  useEffect(() => {
    if (isSuccess && resultVisible) toast.success(t('readyToast'))
  }, [isSuccess, resultVisible, t])

  if (projectQuery.isError || (estimateError && !flowError))
    return (
      <DesignLoadError
        onRetry={() => {
          void projectQuery.refetch()
          void refetch()
        }}
      />
    )

  return (
    <>
      <StepProgress
        current={2}
        currentDone={Boolean(result) && resultVisible}
        currentDoneAt={result?.completedAt}
        title={
          result && resultVisible
            ? project
              ? t('pageTitleWithProject', { name: project.name, id: displayProjectId(project.id) })
              : t('pageTitle')
            : failed
              ? t('pageTitle')
              : tWaiting('pageTitle')
        }
        subtitle={result && resultVisible ? resultSubtitle || undefined : undefined}
        back={result && resultVisible ? { href: ROUTES.DESIGN, label: tEntry('backToList') } : undefined}
        previousStep={{ href: designInputRoute(projectId), label: tCommon('back') }}
        entranceKey={`design.${projectId}.step2`}
      />
      <DesignStepLayout
        sidePanel={
          resultVisible || failed ? undefined : (
            <PersonalizedPanel
              filter={filter}
              kind='2d'
              topic='architecture'
              filterLabel={filterLabel}
              matchCriteria={matchCriteria}
            />
          )
        }
        sidePanelCollapsed={!resultVisible && panelMinimized}
        waiting={!resultVisible && !failed}
        entranceKey={`design.${projectId}.${result && resultVisible ? 'estimate-result' : 'estimate-waiting'}`}
      >
        {result && resultVisible ? (
          <EstimateResultView
            result={result}
            customerName={user?.name ?? ''}
            projectName={project?.name ?? ''}
            input={draft}
            // Đánh dấu đúng ý định điều hướng: từ màn kết quả dự toán phải bắt
            // đầu lại ở M07, kể cả project từng có dossier `ready` từ lần render
            // trước. Mở trực tiếp dossier từ danh sách dự án vẫn vào M09.
            onContinue={() => router.push(`${designDossierRoute(projectId)}?entry=estimate`)}
          />
        ) : failed ? (
          <EstimateFailed projectId={projectId} failureCode={flowError?.failureCode} onRetried={() => void refetch()} />
        ) : (
          <GenerationWaiting
            flow='estimate'
            complete={Boolean(result)}
            // AI thật không có tiến độ phần trăm để hỏi, thời gian chờ không biết trước: vòng quay chậm hơn bản mock.
            indeterminate={!env.NEXT_PUBLIC_USE_MOCK_API}
            province={draft?.addressDetail.provinceName}
            chatStream={<ProactiveChatStream />}
          />
        )}
      </DesignStepLayout>
    </>
  )
}
