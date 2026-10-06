'use client'

import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'

import {
  DossierOverview,
  DossierReady,
  DossierRenderWaiting,
  useDossierRenderFlow,
  StepProgress,
  useAdvisory,
  useCreateShareLink,
  useRevokeShareLink,
  DesignLoadError,
  useDesignStore,
  useDossier,
  useEstimate,
  useFloorCountLabel,
  useProject,
  useRenderDossier,
  useSendDossierEmail,
  type DossierProjectInfo
} from '@/features/design'
import { ProactiveChatStream } from '@/features/chatbot'
import { PersonalizedPanel, useHandbookPanelStore, type HandbookFilter } from '@/features/handbook'
import { useRouter } from '@/i18n/navigation'
import { useAuth } from '@/shared/auth'
import { env } from '@/shared/config/env'
import { designDossierRoute, designEstimateRoute } from '@/shared/constants/routes'
import { useProjectChatContext } from '../use-project-chat-context'

/**
 * Bước 3 (mục III.4). Trong lúc render, M07 vẫn được giữ mounted: panel "Xuất
 * hồ sơ" morph thành tiến độ tại chỗ, sau đó panel cẩm nang NỘI THẤT mới vào.
 */
export function StepDossierView({ projectId }: { projectId: string }) {
  const t = useTranslations('design.dossier')
  const tCommon = useTranslations('common')
  const tWaiting = useTranslations('design.progress.dossier')
  const tInput = useTranslations('design.input')
  const floorLabel = useFloorCountLabel()
  const tPanel = useTranslations('handbook.panel')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const enteredFromEstimate = searchParams.get('entry') === 'estimate'

  const draft = useDesignStore((s) => s.drafts[projectId])
  const projectQuery = useProject(projectId)
  const project = projectQuery.data
  const estimateQuery = useEstimate(projectId, { readOnly: true })
  const estimate = estimateQuery.data
  const dossierQuery = useDossier(projectId)
  const dossier = dossierQuery.data
  const render = useRenderDossier(projectId)
  const createShareLink = useCreateShareLink(projectId)
  const revokeShareLink = useRevokeShareLink(projectId)
  // Dự toán THẬT: chủ bản chọn ngày hết hạn và thu hồi link được; dự án mock giữ link tạo sẵn.
  const manageShare = !env.NEXT_PUBLIC_USE_MOCK_API
  const sendEmail = useSendDossierEmail(projectId)
  const advisory = useAdvisory(estimate, user?.name ?? '', draft)
  const panelMinimized = useHandbookPanelStore((s) => s.minimized)
  const setPanelMinimized = useHandbookPanelStore((s) => s.setMinimized)
  const openedPanelForRenderRef = useRef(false)
  const reduced = useReducedMotion()
  const flow = useDossierRenderFlow({
    enabled: !render.isIdle,
    complete: render.isSuccess && dossier?.status === 'ready',
    error: render.isError
  })

  const filter = useMemo<HandbookFilter>(
    () => ({
      interiorStyle: draft?.style ?? undefined,
      buildingType: draft?.buildingType ?? undefined,
      floorCount: draft?.floorCount ?? undefined
    }),
    [draft]
  )

  // Dòng ghi rõ căn cứ lọc trên panel (Phần 1.3): Bước 3 ưu tiên phong cách nội thất.
  const filterLabel = useMemo(() => {
    if (!draft?.style || !draft.buildingType) return undefined
    return tPanel('filterLabel3d', {
      style: tInput(`style.options.${draft.style}`),
      building: tInput(`buildingType.options.${draft.buildingType}`)
    })
  }, [draft, tInput, tPanel])

  // Chatbox AI chuyển sang kịch bản render hồ sơ trong lúc chờ (mục III.4b).
  useProjectChatContext(project?.name ?? '', draft, render.isPending ? 'dossier' : null)

  // Bắt đầu M08 thì Cẩm nang luôn ở trạng thái mở, kể cả M06 trước đó người dùng
  // đã thu nhỏ panel. Chỉ ép mở một lần; đóng lại trong lúc render là lựa chọn
  // của người dùng và không bị effect này bật ngược trở lại.
  useEffect(() => {
    if (!render.isPending || openedPanelForRenderRef.current) return
    openedPanelForRenderRef.current = true
    setPanelMinimized(false)
  }, [render.isPending, setPanelMinimized])

  const info: DossierProjectInfo = {
    customerName: user?.name ?? '',
    projectName: project?.name ?? '',
    projectId,
    phone: user?.phone ?? '',
    address: draft?.address ?? '',
    createdAt: project?.createdAt ?? new Date().toISOString(),
    buildingTypeLabel: draft?.buildingType ? tInput(`buildingType.options.${draft.buildingType}`) : '',
    // Tum chỉ ghi khi loại công trình có áp dụng (hồ sơ lưu `null` khi không áp dụng).
    scaleLabel: draft?.floorCount
      ? [
          floorLabel(draft.floorCount),
          draft.hasAttic === null ? '' : tInput(draft.hasAttic ? 'attic.options.yes' : 'attic.options.no')
        ]
          .filter(Boolean)
          .join(' · ')
      : '',
    floorArea: estimate?.estimatedFloorArea ?? 0,
    packageLabel: draft ? tInput(`packageTier.options.${draft.packageTier}`) : '',
    styleLabel: draft?.style ? tInput(`style.options.${draft.style}`) : ''
  }

  const finishing = render.isSuccess && flow.phase !== 'ready'
  const renderActive = render.isPending || render.isError || finishing
  // `dossier.status` là dữ liệu bền vững của project. Nếu project từng render
  // xong, nó vẫn là `ready` khi người dùng quay về M06. Nhưng nút “Nhận hồ sơ
  // thi công” là một fresh flow: phải đi M07 → M08 → M09, không được dùng
  // trạng thái `ready` cũ để nhảy thẳng tới M09.
  const currentRenderStarted = !render.isIdle
  const showingFiles =
    dossier?.status === 'ready' &&
    (!enteredFromEstimate || currentRenderStarted) &&
    (!renderActive || flow.phase === 'files')

  // Khi fresh flow đã chạy trọn đến M09 thì dọn marker khỏi URL. Sau đó reload
  // M09 hoặc mở lại từ “Xem hồ sơ” sẽ dùng trạng thái persisted bình thường.
  useEffect(() => {
    if (!enteredFromEstimate || flow.phase !== 'ready') return
    router.replace(designDossierRoute(projectId), { scroll: false })
  }, [enteredFromEstimate, flow.phase, projectId, router])

  if (projectQuery.isError || dossierQuery.isError || estimateQuery.isError)
    return (
      <DesignLoadError
        onRetry={() => {
          void projectQuery.refetch()
          void dossierQuery.refetch()
          void estimateQuery.refetch()
        }}
      />
    )

  return (
    <>
      <StepProgress
        current={3}
        currentDone={showingFiles && flow.phase !== 'files'}
        title={renderActive ? tWaiting('pageTitle') : t('pageTitle')}
        previousStep={{ href: designEstimateRoute(projectId), label: tCommon('back') }}
        entranceKey={`design.${projectId}.step3`}
        animateEntrance={false}
      />

      <div className='relative'>
        <AnimatePresence mode='sync' initial={false}>
          {dossierQuery.isPending ? (
            <div key='dossier-resolving' className='min-h-[28rem]' aria-hidden />
          ) : showingFiles && dossier ? (
            <DossierReady
              key='ready'
              dossier={dossier}
              result={estimate}
              info={info}
              advisory={advisory}
              animateCompletion={render.isSuccess}
              fromRender={render.isSuccess}
              filesEntering={flow.phase === 'files'}
              onFilesEntered={flow.finish}
              onRequestShareLink={() => createShareLink.mutate(undefined)}
              onCreateLink={
                manageShare
                  ? async (expiryDate) => {
                      await createShareLink.mutateAsync(expiryDate)
                    }
                  : undefined
              }
              onRevokeLink={
                manageShare
                  ? async () => {
                      if (dossier?.shareToken) await revokeShareLink.mutateAsync(dossier.shareToken)
                    }
                  : undefined
              }
              onSendEmail={async (email) => {
                const outcome = await sendEmail.mutateAsync(email)
                if (outcome === 'unknown') toast.warning(t('share.email.unknown', { email }))
                else toast.success(t('share.email.sent', { email }))
                return outcome
              }}
            />
          ) : (
            <motion.div
              key='overview'
              exit={{
                opacity: 0,
                scale: reduced ? 1 : 0.96,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                pointerEvents: 'none'
              }}
              transition={{ duration: reduced ? 0 : 0.45 }}
              data-m08-long-wait={flow.longWait}
            >
              <DossierOverview
                info={info}
                result={estimate}
                onRender={() => render.mutate()}
                isRendering={render.isPending}
                renderActive={renderActive}
                renderContent={
                  <DossierRenderWaiting
                    flow={flow}
                    onRetry={() => render.mutate()}
                    onComplete={flow.showFiles}
                    chatStream={
                      <ProactiveChatStream dossierStage={flow.error ? 'error' : flow.task} sessionKey={projectId} />
                    }
                  />
                }
                waitingPanel={
                  <PersonalizedPanel
                    filter={filter}
                    kind='3d'
                    topic='interior'
                    filterLabel={filterLabel}
                    longWait={flow.longWait}
                  />
                }
                waitingPanelCollapsed={panelMinimized}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
