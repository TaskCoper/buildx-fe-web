'use client'

import { AlertCircle, Box, Check, Loader2, Lock, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'
import { Link } from '@/i18n/navigation'
import { Button } from '@/shared/components/ui/button'
import { designEstimateRoute } from '@/shared/constants/routes'
import { estimatePipelineApi } from '../api/estimate-pipeline.api'
import { useRender3dResult } from '../hooks/use-render3d-result'
import { useStageRun } from '../hooks/use-stage-run'
import { useStages } from '../hooks/use-stages'
import type { Render3dResult } from '../schemas/pipeline-api.schema'
import { estimateFailureKind, stageRetryState } from '../services/estimate-stage.logic'
import { isStageActive, stageOf } from '../services/pipeline.logic'
import { StageRunProgress, StageStateCard } from './pipeline-state-card'

export function Render3dStageView({ projectId }: { projectId: string }) {
  const t = useTranslations('design.pipeline.render3d')
  const errors = useTranslations('design.pipeline.estimate')
  const stages = useStages(projectId)
  const stage = stageOf(stages.data, 'Render3d')
  const result = useRender3dResult(projectId, stage)
  const run = useStageRun(projectId, 'Render3d')
  const busy = isStageActive(stage?.status)
  const retry = stageRetryState(stage ?? {})
  const start = async () => {
    if (run.isPending) return
    try {
      await run.mutateAsync(undefined)
    } catch (error) {
      const kind = run.kindOf(error)
      if (kind !== 'inProgress' && kind !== 'alreadySucceeded') toast.error(run.messageOf(error))
    }
  }
  if (!stage && stages.isPending)
    return (
      <div className='flex min-h-64 items-center justify-center'>
        <Loader2 className='size-6 animate-spin' aria-label={t('loading')} />
      </div>
    )
  if (stage?.status === 'Locked')
    return (
      <StageStateCard icon={<Lock className='size-6' />} title={t('locked')} description={t('lockedHint')}>
        <Button asChild variant='outline'>
          <Link href={designEstimateRoute(projectId)}>{t('back')}</Link>
        </Button>
      </StageStateCard>
    )
  const done = stage?.status === 'Succeeded'
  const failed = stage?.status === 'Failed'
  return (
    <div className='space-y-6'>
      {(stages.isError || result.isError) && (
        <div role='alert' className='bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4'>
          <p>{t('loadError')}</p>
          <Button
            variant='outline'
            onClick={() => {
              void stages.refetch()
              void result.refetch()
            }}
          >
            <RefreshCw className='size-4' />
            {t('reload')}
          </Button>
        </div>
      )}
      {stage && (
        <StageStateCard
          icon={
            busy ? (
              <Loader2 className='size-6 animate-spin' />
            ) : failed ? (
              <AlertCircle className='text-destructive size-6' />
            ) : done ? (
              <Check className='text-primary size-6' />
            ) : (
              <Box className='size-6' />
            )
          }
          title={t(done ? 'succeeded' : failed ? 'failed' : busy ? 'running' : 'ready')}
          description={
            failed
              ? errors(`failure.${estimateFailureKind(stage.failureCode)}`)
              : t(done ? 'dossierNext' : busy ? 'runningHint' : 'noQuota')
          }
        >
          <div className='w-full space-y-3' aria-live='polite'>
            {(busy || result.data?.planReady) && (
              <StageRunProgress
                progress={result.data?.progress}
                progressText={
                  result.data?.progress.total != null
                    ? t('progress', result.data.progress as { done: number; total: number })
                    : t('preparing')
                }
              />
            )}
            {busy && !result.data?.planReady && <p className='text-muted-foreground text-sm'>{t('preparing')}</p>}
            {failed && (
              <p className='text-muted-foreground text-sm'>
                {retry.kind === 'limit'
                  ? errors('retryLimit')
                  : retry.kind === 'left'
                    ? errors('retriesLeft', { count: retry.count })
                    : errors('retryUnknown')}
              </p>
            )}
            {(stage.status === 'Ready' || (failed && retry.kind !== 'limit')) && (
              <Button onClick={() => void start()} disabled={run.isPending}>
                {run.isPending && <Loader2 className='size-4 animate-spin' />}
                {t(failed ? 'retry' : 'start')}
              </Button>
            )}
          </div>
        </StageStateCard>
      )}
      {result.data && <Render3dGallery result={result.data} />}
    </div>
  )
}

function Render3dGallery({ result }: { result: Render3dResult }) {
  const t = useTranslations('design.pipeline.render3d')
  const groups = [...new Set(result.items.map((item) => item.groupKey))]
  return (
    <div className='space-y-8'>
      {result.notes.length > 0 && (
        <aside className='bg-muted/50 rounded-xl border p-4'>
          <h2 className='font-medium'>{t('notes')}</h2>
          <ul className='mt-2 list-disc space-y-1 pl-5 text-sm'>
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </aside>
      )}
      {groups.map((group) => (
        <section key={group} className='space-y-3'>
          <h2 className='text-lg font-semibold'>{result.items.find((item) => item.groupKey === group)?.groupLabel}</h2>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {result.items
              .filter((item) => item.groupKey === group)
              .map((item) => (
                <Render3dImage key={item.itemKey} item={item} />
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Render3dImage({ item }: { item: Render3dResult['items'][number] }) {
  const t = useTranslations('design.pipeline.render3d')
  const [version, setVersion] = useState(0)
  const [failed, setFailed] = useState(false)
  const href = item.fileUrl ? estimatePipelineApi.fileHref(item.fileUrl) : null
  return (
    <figure className='bg-card overflow-hidden rounded-xl border shadow-xs'>
      <div className='bg-muted relative aspect-video'>
        {href && !failed ? (
          <a href={href} target='_blank' rel='noreferrer' aria-label={t('openImage', { name: item.label })}>
            {/* Private file route redirects to a fresh signed URL; Next image proxy must not cache it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${href}${href.includes('?') ? '&' : '?'}v=${version}`}
              alt={item.label}
              width={1280}
              height={720}
              loading='lazy'
              className='size-full object-cover'
              onError={() => setFailed(true)}
            />
          </a>
        ) : (
          <div className='text-muted-foreground absolute inset-0 flex items-center justify-center p-4 text-center text-sm'>
            {failed ? (
              <Button
                variant='outline'
                onClick={() => {
                  setVersion((v) => v + 1)
                  setFailed(false)
                }}
              >
                {t('reloadImage')}
              </Button>
            ) : (
              t('pending')
            )}
          </div>
        )}
      </div>
      <figcaption className='p-3 text-sm font-medium'>{item.label}</figcaption>
    </figure>
  )
}
