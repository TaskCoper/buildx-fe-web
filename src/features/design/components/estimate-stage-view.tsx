'use client'

import { AlertCircle, Calculator, Clock, Loader2, Lock, RefreshCw } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Button } from '@/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { designPlanRoute, designRender3dRoute } from '@/shared/constants/routes'
import { isApiError } from '@/shared/lib/api'
import { formatDisplayDate } from '@/shared/utils'
import { useEstimateDetail } from '../hooks/use-estimate-detail'
import { useEstimateStageResult } from '../hooks/use-estimate-stage-result'
import { useStageRun } from '../hooks/use-stage-run'
import { useStages } from '../hooks/use-stages'
import type { EstimateStageResult } from '../schemas/pipeline-api.schema'
import {
  estimateFailureKind,
  estimateGrandTotal,
  estimateScheduleRows,
  estimateTabs,
  formatEstimateAmount,
  formatEstimateQuantity,
  stageRetryState,
  type EstimatePart,
  type EstimateTab
} from '../services/estimate-stage.logic'
import { isStageActive, stageOf, type StageStatus, type StageView } from '../services/pipeline.logic'
import { StageRunProgress, StageStateCard } from './pipeline-state-card'
import { StageWaitingLayout } from './stage-waiting-layout'

/**
 * Màn chặng Dự toán của luồng bốn chặng (STORY-PROJ-008, TDD-PROJ-009 mục P): Chưa mở (chặng 2D chưa xong), Sẵn sàng
 * (nút Tạo dự toán, không kiểm gói hay trừ lượt — BR-PROJ-010 khoản 5), Đang chạy (tiến độ, hỏi lại trạng thái mỗi 5
 * giây), Lỗi (câu chung theo mã lỗi, số lần chạy lại còn lại hoặc báo liên hệ hỗ trợ — BR-PROJ-011) và Thành công
 * (bảng dự toán theo màn của app demo).
 */
export function EstimateStageView({
  projectId,
  embedded = false,
  waitingPanel,
  waitingPanelCollapsed = false
}: {
  projectId: string
  embedded?: boolean
  /** Mẫu thư viện do lớp app ghép vào cột trái trong lúc chặng chạy (BR-LIB-001 khoản 16). */
  waitingPanel?: ReactNode
  waitingPanelCollapsed?: boolean
}) {
  const t = useTranslations('design.pipeline.estimate')
  const stages = useStages(projectId)
  const stage = stageOf(stages.data, 'Estimate')
  const succeeded = stage?.status === 'Succeeded'
  const result = useEstimateStageResult(projectId, { enabled: succeeded })
  useReadyToast(stage?.status)

  if (stages.isError)
    return (
      <StageStateCard icon={<AlertCircle className='text-destructive size-6' />} title={t('loadError')}>
        <Button variant='outline' onClick={() => void stages.refetch()}>
          <RefreshCw className='size-4' />
          {t('reload')}
        </Button>
      </StageStateCard>
    )
  if (stages.isPending) return <Spinner />

  if (succeeded) {
    if (result.isError)
      return (
        <StageStateCard icon={<AlertCircle className='text-destructive size-6' />} title={t('resultLoadError')}>
          <Button variant='outline' onClick={() => void result.refetch()}>
            <RefreshCw className='size-4' />
            {t('reload')}
          </Button>
        </StageStateCard>
      )
    if (!result.data) return <Spinner />
    if (embedded) return <EstimateStageResultView result={result.data} />
    return (
      <div className='space-y-6'>
        <EstimateStageResultView result={result.data} />
        <div className='flex justify-end'>
          <Button asChild>
            <Link href={designRender3dRoute(projectId)}>{t('toRender3d')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (stage && isStageActive(stage.status))
    return (
      <StageWaitingLayout panel={waitingPanel} collapsed={waitingPanelCollapsed}>
        <RunningCard stage={stage} />
      </StageWaitingLayout>
    )
  // Trong bước Dự toán & 3D, nút chạy nằm ở thanh thao tác chung (Đi tiếp/Thử lại), không ở từng tab.
  if (stage?.status === 'Failed') return <FailedCard projectId={projectId} stage={stage} embedded={embedded} />
  if (stage?.status === 'Ready') return <NotStartedCard projectId={projectId} embedded={embedded} />
  // Chưa mở, hoặc BE chưa trả chặng Dự toán trong danh sách: khách cần xong chặng 2D trước.
  return (
    <StageStateCard
      icon={<Lock className='text-muted-foreground size-6' />}
      title={t('locked')}
      description={t('lockedHint')}
    >
      <Button asChild variant='outline'>
        <Link href={designPlanRoute(projectId)}>{t('viewPlan')}</Link>
      </Button>
    </StageStateCard>
  )
}

function Spinner() {
  return (
    <div className='text-muted-foreground flex min-h-64 items-center justify-center'>
      <Loader2 className='size-5 animate-spin' />
    </div>
  )
}

/** Báo "Đã lập xong dự toán." khi thấy chặng chuyển từ đang chạy sang thành công trong lúc khách mở màn, như app demo. */
function useReadyToast(status: StageStatus | undefined) {
  const t = useTranslations('design.pipeline.estimate')
  const previous = useRef(status)
  useEffect(() => {
    const before = previous.current
    previous.current = status
    if (status === 'Succeeded' && isStageActive(before)) toast.success(t('readyToast'))
  }, [status, t])
}

function RunningCard({ stage }: { stage: StageView }) {
  const t = useTranslations('design.pipeline.estimate')
  const locale = useLocale() as Locale
  const queued = stage.status === 'Queued'
  return (
    <StageStateCard
      icon={
        queued ? <Clock className='text-primary size-6' /> : <Loader2 className='text-primary size-6 animate-spin' />
      }
      title={queued ? t('queued') : t('running')}
      description={queued ? t('queuedHint') : t('runningHint')}
    >
      <StageRunProgress
        progress={stage.progress}
        progressText={
          stage.progress
            ? stage.progress.total
              ? t('progress', { done: stage.progress.done, total: stage.progress.total })
              : t('progressUnknown', { done: stage.progress.done })
            : undefined
        }
        deadlineText={
          stage.deadlineUtc
            ? t('deadline', { time: formatDisplayDate(stage.deadlineUtc, locale, { time: true }) })
            : undefined
        }
      />
    </StageStateCard>
  )
}

/**
 * Bấm Tạo dự toán hoặc Chạy lại. Chặng này không kiểm gói, không giữ hay trừ lượt; BE bỏ qua thân yêu cầu, nên chỉ gửi
 * `inputVersion` khi bản dự toán đã tải sẵn (không đọc lại như chặng 2D).
 */
function useRunEstimate(projectId: string) {
  const t = useTranslations('design.pipeline.estimate')
  const run = useStageRun(projectId, 'Estimate')
  const detail = useEstimateDetail(projectId)
  const start = async () => {
    if (run.isPending) return
    try {
      await run.mutateAsync(detail.data?.inputVersion)
    } catch (error) {
      const kind = run.kindOf(error)
      if (kind === 'inProgress' || kind === 'alreadySucceeded') return
      toast.error(kind === 'other' && !isApiError(error) ? t('startError') : run.messageOf(error))
    }
  }
  return { start, busy: run.isPending }
}

function NotStartedCard({ projectId, embedded }: { projectId: string; embedded: boolean }) {
  const t = useTranslations('design.pipeline.estimate')
  const tGroup = useTranslations('design.pipeline.group')
  const { start, busy } = useRunEstimate(projectId)
  return (
    <StageStateCard
      icon={<Calculator className='text-primary size-6' />}
      title={t('notStarted')}
      description={embedded ? tGroup('nextHint') : t('notStartedHint')}
    >
      <Button asChild variant='outline'>
        <Link href={designPlanRoute(projectId)}>{t('viewPlan')}</Link>
      </Button>
      {embedded ? null : (
        <Button onClick={() => void start()} disabled={busy}>
          {busy ? <Loader2 className='size-4 animate-spin' /> : null}
          {t('start')}
        </Button>
      )}
    </StageStateCard>
  )
}

function FailedCard({ projectId, stage, embedded }: { projectId: string; stage: StageView; embedded: boolean }) {
  const t = useTranslations('design.pipeline.estimate')
  const { start, busy } = useRunEstimate(projectId)
  const retry = stageRetryState(stage)
  return (
    <StageStateCard
      icon={<AlertCircle className='text-destructive size-6' />}
      title={t('failed')}
      description={t(`failure.${estimateFailureKind(stage.failureCode)}`)}
    >
      <div className='w-full space-y-3'>
        <p className='text-muted-foreground text-sm'>
          {retry.kind === 'limit'
            ? t('retryLimit')
            : retry.kind === 'left'
              ? t('retriesLeft', { count: retry.count })
              : t('retryUnknown')}
        </p>
        <div className='flex flex-wrap justify-center gap-2'>
          <Button asChild variant='outline'>
            <Link href={designPlanRoute(projectId)}>{t('viewPlan')}</Link>
          </Button>
          {retry.kind === 'limit' || embedded ? null : (
            <Button onClick={() => void start()} disabled={busy}>
              {busy ? <Loader2 className='size-4 animate-spin' /> : <RefreshCw className='size-4' />}
              {t('retry')}
            </Button>
          )}
        </div>
      </div>
    </StageStateCard>
  )
}

/**
 * Kết quả chặng Dự toán gửi khách, theo màn dự toán của app demo: ba tab Phần thô, Hoàn thiện, Nội thất; mỗi tab là
 * bảng năm cột chia theo nhóm (hạng mục kèm kích thước ở nội thất, đơn vị, khối lượng, đơn giá, thành tiền) và dòng
 * tổng của phần; cuối là tổng dự toán. Thêm đúng các mục STORY-PROJ-008 bước 8 đòi mà app demo không hiện: đơn giá trên
 * m² sàn quy đổi, thời gian thi công dự kiến và đoạn tư vấn. Không hiện hãng vật tư, ghi chú dòng, phân tích, cờ hay
 * cảnh báo; không có tải Excel ở chặng này (TDD-PROJ-009 mục P).
 */
export function EstimateStageResultView({ result }: { result: EstimateStageResult }) {
  const t = useTranslations('design.pipeline.estimate.result')
  const locale = useLocale() as Locale
  const tabs = estimateTabs(result)
  // Luôn mở tab Phần thô như app demo; căn hộ không có phần thô thì tab này hiện dòng "không có hạng mục".
  const [active, setActive] = useState<EstimatePart>('structure')
  // Thiếu số thì in "0 đ" như `money(n || 0)` của app demo.
  const money = (value: number | null | undefined) => t('money', { value: formatEstimateAmount(value, locale) })
  // Hai ô ngoài màn của app demo (STORY-PROJ-008 bước 8) chỉ hiện khi BE có số.
  const pricePerM2 =
    typeof result.pricePerM2Vnd === 'number' ? formatEstimateAmount(result.pricePerM2Vnd, locale) : null
  const floorArea =
    typeof result.convertedFloorAreaM2 === 'number' ? formatEstimateQuantity(result.convertedFloorAreaM2, locale) : null
  const schedule = estimateScheduleRows(result.schedule)

  return (
    <div className='space-y-6'>
      <section className='bg-card space-y-4 rounded-2xl border p-5 shadow-xs sm:p-6'>
        <Tabs value={active} onValueChange={(value) => setActive(value as EstimatePart)} className='gap-4'>
          <TabsList aria-label={t('title')} className='h-auto w-full flex-wrap sm:w-fit'>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.part} value={tab.part} className='px-4 py-1.5'>
                {t(`tabs.${tab.part}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.part} value={tab.part}>
              <PartTable tab={tab} money={money} />
            </TabsContent>
          ))}
        </Tabs>

        <div className='bg-primary text-primary-foreground flex items-center justify-between gap-4 rounded-xl px-4 py-3'>
          <span className='font-medium'>{t('grandTotal')}</span>
          <strong className='text-xl tabular-nums'>{money(estimateGrandTotal(result))}</strong>
        </div>
      </section>

      {pricePerM2 !== null || schedule.length ? (
        <div className='grid gap-4 md:grid-cols-2'>
          {pricePerM2 !== null ? (
            <section className='bg-card rounded-2xl border p-5 shadow-xs'>
              <p className='text-muted-foreground text-sm'>{t('pricePerM2')}</p>
              <p className='mt-1 text-2xl font-semibold tabular-nums'>{t('pricePerM2Value', { value: pricePerM2 })}</p>
              {floorArea !== null ? (
                <p className='text-muted-foreground mt-1 text-xs'>{t('floorArea', { value: floorArea })}</p>
              ) : null}
            </section>
          ) : null}
          {schedule.length ? (
            <section className='bg-card rounded-2xl border p-5 shadow-xs'>
              <h3 className='mb-3 font-semibold'>{t('schedule.title')}</h3>
              <dl className='space-y-2 text-sm'>
                {schedule.map((row) => (
                  <div
                    key={row.key}
                    className={
                      row.key === 'total'
                        ? 'flex justify-between gap-4 border-t pt-2 font-semibold'
                        : 'flex justify-between gap-4'
                    }
                  >
                    <dt className={row.key === 'total' ? undefined : 'text-muted-foreground'}>
                      {t(`schedule.${row.key}`)}
                    </dt>
                    <dd className='text-right'>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      ) : null}

      {result.advice?.trim() ? (
        <section className='bg-accent/60 border-primary/20 rounded-2xl border p-5'>
          <h3 className='text-primary-strong mb-3 font-semibold'>{t('advice')}</h3>
          {/* Văn bản gửi khách hiện như văn bản thuần (TDD-PROJ-009 mục L), giữ xuống dòng của BE. */}
          <p className='text-sm whitespace-pre-line text-pretty'>{result.advice}</p>
        </section>
      ) : null}

      <section className='bg-muted/40 flex items-start gap-3 rounded-2xl border border-dashed p-5 text-sm'>
        <Lock className='text-muted-foreground mt-0.5 size-4 shrink-0' />
        <p className='text-muted-foreground text-pretty'>{t('nextStageLocked')}</p>
      </section>
    </div>
  )
}

/** Bảng của một tab như `partTableHtml` của app demo: dòng nhóm, rồi từng hạng mục; cuối là tổng của phần. */
function PartTable({ tab, money }: { tab: EstimateTab; money: (value: number | null | undefined) => string }) {
  const t = useTranslations('design.pipeline.estimate.result')
  const locale = useLocale() as Locale
  return (
    <div className='overflow-hidden rounded-xl border'>
      <Table>
        <TableHeader>
          <TableRow className='bg-muted/50 hover:bg-muted/50'>
            <TableHead className='pl-4'>{t('columns.item')}</TableHead>
            <TableHead>{t('columns.unit')}</TableHead>
            <TableHead className='text-right'>{t('columns.quantity')}</TableHead>
            <TableHead className='text-right'>{t('columns.unitPrice')}</TableHead>
            <TableHead className='pr-4 text-right'>{t('columns.amount')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tab.empty ? (
            <TableRow>
              <TableCell colSpan={5} className='text-muted-foreground py-3 pl-4'>
                {t('emptyPart')}
              </TableCell>
            </TableRow>
          ) : (
            tab.groups.map((group, groupIndex) => (
              <Fragment key={`${group.name}-${groupIndex}`}>
                <TableRow className='bg-accent hover:bg-accent'>
                  <TableCell colSpan={5} className='text-primary-strong py-2.5 pl-4 font-semibold whitespace-normal'>
                    {group.name}
                  </TableCell>
                </TableRow>
                {group.items.map((item, itemIndex) => (
                  <TableRow key={`${item.name}-${itemIndex}`}>
                    <TableCell className='min-w-56 py-2.5 pl-4 whitespace-normal'>
                      {item.name}
                      {item.size ? <small className='text-muted-foreground block'>{item.size}</small> : null}
                    </TableCell>
                    <TableCell className='py-2.5'>{item.unit ?? ''}</TableCell>
                    <TableCell className='py-2.5 text-right tabular-nums'>
                      {formatEstimateQuantity(item.quantity, locale)}
                    </TableCell>
                    <TableCell className='py-2.5 text-right tabular-nums'>{money(item.unitPrice)}</TableCell>
                    <TableCell className='py-2.5 pr-4 text-right tabular-nums'>{money(item.amount)}</TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
      <div className='bg-muted/60 flex items-center justify-between gap-4 border-t px-4 py-3 font-semibold'>
        <span>{t(`partTotal.${tab.part}`)}</span>
        <span className='tabular-nums'>{money(tab.total)}</span>
      </div>
    </div>
  )
}
