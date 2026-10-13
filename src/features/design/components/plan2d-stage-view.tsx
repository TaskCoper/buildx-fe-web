'use client'

import { AlertCircle, ArrowRight, Clock, Download, Loader2, PencilLine, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Button } from '@/shared/components/ui/button'
import { designEstimateRoute, designInputRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDate } from '@/shared/utils'
import { estimatePipelineApi } from '../api/estimate-pipeline.api'
import { useEstimateDetail } from '../hooks/use-estimate-detail'
import { usePlan2dResult } from '../hooks/use-plan2d-result'
import { useStageGroupRun } from '../hooks/use-stage-group-run'
import { useStageRun } from '../hooks/use-stage-run'
import { useStages } from '../hooks/use-stages'
import { stageGroupActions, stageOf, type StageView } from '../services/pipeline.logic'
import type { Plan2dDrawing, Plan2dResult } from '../schemas/pipeline-api.schema'
import { StageRunProgress, StageStateCard as StateCard } from './pipeline-state-card'

/** Mã lỗi lần chạy → câu cho khách (`design.pipeline.plan.failure.<key>`); chi tiết kỹ thuật chỉ ở phần Admin. */
function failureKey(code: string | null | undefined) {
  switch (code) {
    case 'DrawingUnavailable':
    case 'AiOutputIncomplete':
    case 'AiContentBlocked':
    case 'StageTimedOut':
      return code
    case 'AiProviderUnavailable':
    case 'AiOutOfCredit':
      return 'AiServiceDown'
    default:
      return 'generic'
  }
}

/**
 * Màn chặng Bản vẽ 2D của luồng bốn chặng (STORY-PROJ-002, TDD-PROJ-006/007): theo dõi lần chạy (đang chờ, đang
 * chạy kèm tiến độ x/y), báo lỗi kèm số lần chạy lại còn lại, và hiện kết quả khi thành công. Không tự chạy lại; chạy
 * lại là thao tác của khách và giữ lượt mới vì lượt cũ đã được hoàn (BR-PROJ-011 khoản 5).
 */
export function Plan2dStageView({ projectId, waitingPanel }: { projectId: string; waitingPanel?: ReactNode }) {
  const t = useTranslations('design.pipeline.plan')
  const stages = useStages(projectId)
  const plan2d = stageOf(stages.data, 'Plan2d')
  const succeeded = plan2d?.status === 'Succeeded'
  const result = usePlan2dResult(projectId, { enabled: succeeded })

  if (stages.isError)
    return (
      <StateCard icon={<AlertCircle className='text-destructive size-6' />} title={t('loadError')}>
        <Button variant='outline' onClick={() => void stages.refetch()}>
          <RefreshCw className='size-4' />
          {t('reload')}
        </Button>
      </StateCard>
    )
  if (stages.isPending || !plan2d)
    return (
      <div className='text-muted-foreground flex min-h-64 items-center justify-center'>
        <Loader2 className='size-5 animate-spin' />
      </div>
    )

  if (succeeded) {
    if (result.isError)
      return (
        <StateCard icon={<AlertCircle className='text-destructive size-6' />} title={t('resultLoadError')}>
          <Button variant='outline' onClick={() => void result.refetch()}>
            <RefreshCw className='size-4' />
            {t('reload')}
          </Button>
        </StateCard>
      )
    if (!result.data)
      return (
        <div className='text-muted-foreground flex min-h-64 items-center justify-center'>
          <Loader2 className='size-5 animate-spin' />
        </div>
      )
    return <Plan2dResultView result={result.data} projectId={projectId} />
  }

  // Trong lúc chờ, lớp app ghép mẫu 2D tham khảo của thư viện vào dưới thẻ tiến độ (BR-LIB-001 khoản 16).
  if (plan2d.status === 'Queued' || plan2d.status === 'Running')
    return (
      <div className='space-y-6'>
        <RunningCard stage={plan2d} />
        {waitingPanel}
      </div>
    )
  if (plan2d.status === 'Failed') return <FailedCard projectId={projectId} stage={plan2d} />
  return <NotStartedCard projectId={projectId} />
}

function RunningCard({ stage }: { stage: StageView }) {
  const t = useTranslations('design.pipeline.plan')
  const locale = useLocale() as Locale
  const queued = stage.status === 'Queued'
  return (
    <StateCard
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
    </StateCard>
  )
}

/** Bấm chạy chặng 2D từ màn này (lần đầu hoặc chạy lại). `inputVersion` lấy từ bản đã lưu. */
function useRunPlan2d(projectId: string) {
  const run = useStageRun(projectId, 'Plan2d')
  const detail = useEstimateDetail(projectId)
  const [busy, setBusy] = useState(false)
  const start = async () => {
    if (busy) return
    setBusy(true)
    try {
      const fresh = await detail.refetch()
      if (!fresh.data) throw fresh.error ?? new Error('EstimateUnavailable')
      await run.mutateAsync(fresh.data.inputVersion)
    } catch (error) {
      const kind = run.kindOf(error)
      if (kind !== 'inProgress' && kind !== 'alreadySucceeded') toast.error(run.messageOf(error))
    } finally {
      setBusy(false)
    }
  }
  return { start, busy }
}

function NotStartedCard({ projectId }: { projectId: string }) {
  const t = useTranslations('design.pipeline.plan')
  const { start, busy } = useRunPlan2d(projectId)
  return (
    <StateCard
      icon={<PencilLine className='text-primary size-6' />}
      title={t('notStarted')}
      description={t('notStartedHint')}
    >
      <Button asChild variant='outline'>
        <Link href={designInputRoute(projectId)}>{t('editInput')}</Link>
      </Button>
      <Button onClick={() => void start()} disabled={busy}>
        {busy ? <Loader2 className='size-4 animate-spin' /> : null}
        {t('start')}
      </Button>
    </StateCard>
  )
}

function FailedCard({ projectId, stage }: { projectId: string; stage: StageView }) {
  const t = useTranslations('design.pipeline.plan')
  const { start, busy } = useRunPlan2d(projectId)
  const blocked = stage.retriesLeft === 0 || stage.blockedReason === 'StageRetryLimitReached'
  return (
    <StateCard
      icon={<AlertCircle className='text-destructive size-6' />}
      title={t('failed')}
      description={t(`failure.${failureKey(stage.failureCode)}`)}
    >
      <div className='w-full space-y-3'>
        <p className='text-muted-foreground text-sm'>
          {blocked
            ? t('retryLimit')
            : stage.retriesLeft !== null && stage.retriesLeft !== undefined
              ? t('retriesLeft', { count: stage.retriesLeft })
              : t('refunded')}
        </p>
        <div className='flex flex-wrap justify-center gap-2'>
          <Button asChild variant='outline'>
            <Link href={designInputRoute(projectId)}>{t('editInput')}</Link>
          </Button>
          {blocked ? null : (
            <Button onClick={() => void start()} disabled={busy}>
              {busy ? <Loader2 className='size-4 animate-spin' /> : <RefreshCw className='size-4' />}
              {t('retry')}
            </Button>
          )}
        </div>
      </div>
    </StateCard>
  )
}

const LOT_SOURCES = ['customer', 'image', 'description', 'default'] as const

/**
 * Kết quả chặng 2D gửi khách: kích thước lô và nguồn, diện tích, phòng từng tầng, lưu ý, bản vẽ từng tầng. Cuối màn có
 * nút sang chặng Dự toán (khách tự bấm từng chặng, BR-PROJ-010 khoản 2).
 */
export function Plan2dResultView({ result, projectId }: { result: Plan2dResult; projectId: string }) {
  const t = useTranslations('design.pipeline.plan')
  const [kind, setKind] = useState<'technical' | 'furniture'>('technical')
  const source = LOT_SOURCES.find((value) => value === result.lot?.source) ?? null
  const drawings = result.drawings.filter((drawing) => drawing.kind === kind)
  const kinds = [...new Set(result.drawings.map((drawing) => drawing.kind))]

  return (
    <div className='space-y-6'>
      <section className='bg-card grid gap-4 rounded-2xl border p-5 shadow-xs sm:grid-cols-3 sm:p-6'>
        <Fact
          label={t('result.lot')}
          value={result.lot ? t('result.lotValue', { width: result.lot.widthM, depth: result.lot.depthM }) : '—'}
          hint={source ? t(`result.lotSource.${source}`) : undefined}
        />
        <Fact
          label={t('result.totalFloorArea')}
          value={result.totalFloorAreaM2 != null ? t('result.areaValue', { value: result.totalFloorAreaM2 }) : '—'}
        />
        <Fact
          label={t('result.builtArea')}
          value={result.builtAreaM2 != null ? t('result.areaValue', { value: result.builtAreaM2 }) : '—'}
        />
      </section>

      {result.summary ? <p className='text-muted-foreground text-sm text-pretty'>{result.summary}</p> : null}

      <section className='grid gap-4 md:grid-cols-2'>
        {result.floors.map((floor) => (
          <article key={floor.index} className='bg-card rounded-2xl border p-5 shadow-xs'>
            <header className='mb-3 flex items-baseline justify-between gap-2'>
              <h3 className='font-semibold'>{floor.name}</h3>
              {floor.areaM2 != null ? (
                <span className='text-muted-foreground text-sm'>{t('result.areaValue', { value: floor.areaM2 })}</span>
              ) : null}
            </header>
            <table className='w-full text-sm'>
              <thead className='text-muted-foreground text-left text-xs'>
                <tr>
                  <th className='pb-1 font-medium'>{t('result.room')}</th>
                  <th className='pb-1 font-medium'>{t('result.size')}</th>
                  <th className='pb-1 text-right font-medium'>{t('result.area')}</th>
                </tr>
              </thead>
              <tbody>
                {(floor.rooms ?? []).map((room, index) => (
                  <tr key={`${room.name}-${index}`} className='border-t'>
                    <td className='py-1.5'>{room.name}</td>
                    <td className='text-muted-foreground py-1.5'>{room.size ?? '—'}</td>
                    <td className='py-1.5 text-right'>
                      {room.areaM2 != null ? t('result.areaValue', { value: room.areaM2 }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </section>

      {result.notes?.length || result.assumptions?.length ? (
        <section className='border-warning/40 bg-warning/10 rounded-2xl border p-5 text-sm'>
          <h3 className='mb-2 font-semibold'>{t('result.notes')}</h3>
          <ul className='list-disc space-y-1 pl-5'>
            {[...(result.notes ?? []), ...(result.assumptions ?? [])].map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h3 className='text-base font-semibold'>{t('result.drawings')}</h3>
          {kinds.length > 1 ? (
            <div className='bg-muted inline-flex rounded-lg p-1'>
              {(['technical', 'furniture'] as const)
                .filter((value) => kinds.includes(value))
                .map((value) => (
                  <button
                    key={value}
                    type='button'
                    onClick={() => setKind(value)}
                    aria-pressed={kind === value}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      kind === value ? 'bg-background shadow-xs' : 'text-muted-foreground'
                    )}
                  >
                    {t(`result.kind.${value}`)}
                  </button>
                ))}
            </div>
          ) : null}
        </div>
        <div className='grid gap-4 md:grid-cols-2'>
          {drawings.map((drawing) => (
            <DrawingCard key={`${drawing.kind}-${drawing.floorIndex}`} drawing={drawing} />
          ))}
        </div>
      </section>

      <section className='bg-card flex flex-col gap-3 rounded-2xl border p-5 text-sm shadow-xs sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-pretty'>{t('nextStage')}</p>
        <GoNextButton projectId={projectId} label={t('toEstimate')} />
      </section>
    </div>
  )
}

/**
 * Đi tiếp từ kết quả 2D (STORY-PROJ-002 bước 8): lần đầu thì tiếp nhận cùng lúc Dự toán và 3D rồi mở bước Dự toán & 3D;
 * đã chạy rồi thì chỉ mở bước đó (BR-PROJ-010 khoản 2).
 */
function GoNextButton({ projectId, label }: { projectId: string; label: string }) {
  const stages = useStages(projectId)
  const run = useStageGroupRun(projectId)
  const router = useRouter()
  const actions = stageGroupActions(stageOf(stages.data, 'Estimate'), stageOf(stages.data, 'Render3d'))
  if (!actions.next)
    return (
      <Button asChild className='shrink-0'>
        <Link href={designEstimateRoute(projectId)}>
          {label}
          <ArrowRight className='size-4' />
        </Link>
      </Button>
    )
  const go = async () => {
    if (run.isPending) return
    try {
      await run.mutateAsync()
      router.push(designEstimateRoute(projectId))
    } catch (error) {
      const kind = run.kindOf(error)
      if (kind === 'inProgress' || kind === 'alreadySucceeded') router.push(designEstimateRoute(projectId))
      else toast.error(run.messageOf(error))
    }
  }
  return (
    <Button className='shrink-0' onClick={() => void go()} disabled={run.isPending}>
      {run.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
      {label}
      <ArrowRight className='size-4' />
    </Button>
  )
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className='text-muted-foreground text-xs'>{label}</p>
      <p className='text-lg font-semibold'>{value}</p>
      {hint ? <p className='text-muted-foreground text-xs'>{hint}</p> : null}
    </div>
  )
}

/**
 * Một bản vẽ. `fileUrl` là route BE trả 302 tới link tải có hạn 15 phút (BR-PROJ-006 khoản 12), nên dùng thẳng làm
 * `src` mỗi lần hiển thị; không lưu link đích.
 */
function DrawingCard({ drawing }: { drawing: Plan2dDrawing }) {
  const t = useTranslations('design.pipeline.plan')
  const width = drawing.width ?? 864
  const height = drawing.height ?? 1152
  return (
    <figure className='bg-card overflow-hidden rounded-2xl border shadow-xs'>
      <Image
        src={estimatePipelineApi.fileHref(drawing.fileUrl)}
        alt={`${drawing.floorName ?? ''} — ${t(`result.kind.${drawing.kind === 'furniture' ? 'furniture' : 'technical'}`)}`}
        width={width}
        height={height}
        className='h-auto w-full bg-white object-contain'
        unoptimized
      />
      <figcaption className='flex items-center justify-between gap-2 border-t px-4 py-2.5 text-sm'>
        <span className='font-medium'>{drawing.floorName ?? t('result.floor', { index: drawing.floorIndex })}</span>
        <a
          href={estimatePipelineApi.downloadHref(drawing.fileUrl)}
          className='text-primary inline-flex items-center gap-1 text-sm font-medium'
        >
          <Download className='size-4' />
          {t('result.download')}
        </a>
      </figcaption>
    </figure>
  )
}
