'use client'

import { env } from '@/shared/config/env'
import { AlertCircle, Check, Lightbulb, Loader2 } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { DossierRenderFlow } from '../hooks/use-dossier-render-flow'

const CIRCUMFERENCE = 2 * Math.PI * 68
const PERCENT_CADENCE_MS = 120

function ProgressPercent({ value, reduced, frozen }: { value: number; reduced: boolean | null; frozen: boolean }) {
  const rounded = Math.max(0, Math.min(100, Math.floor(value)))
  const latestRef = useRef(rounded)
  const [displayed, setDisplayed] = useState(rounded)

  useEffect(() => {
    latestRef.current = rounded
  }, [rounded])

  useEffect(() => {
    if (reduced || frozen) return
    const timer = window.setInterval(() => {
      setDisplayed((current) => {
        const latest = latestRef.current
        return latest === current ? current : latest
      })
    }, PERCENT_CADENCE_MS)
    return () => window.clearInterval(timer)
  }, [frozen, reduced])

  const visible = reduced || frozen ? rounded : displayed

  return (
    <span className='relative inline-block h-6 w-12 shrink-0 overflow-hidden text-right text-sm leading-6 font-semibold tabular-nums'>
      <AnimatePresence initial={false} mode='sync'>
        <motion.span
          key={visible}
          className='absolute inset-0 flex items-center justify-end'
          initial={reduced ? false : { y: 6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduced ? undefined : { y: -6, opacity: 0 }}
          transition={{ duration: reduced || frozen ? 0 : 0.09, ease: [0.22, 1, 0.36, 1] }}
        >
          {visible}%
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function DossierRenderWaiting({
  flow,
  onRetry,
  onComplete,
  chatStream
}: {
  flow: DossierRenderFlow
  onRetry: () => void
  onComplete: () => void
  chatStream: ReactNode
}) {
  const t = useTranslations('design.progress.dossier')
  const reduced = useReducedMotion()
  const [tip, setTip] = useState(0)
  const completing = flow.phase === 'completing' && !flow.error

  useEffect(() => {
    if (!completing || (!reduced && env.NEXT_PUBLIC_USE_MOCK_API)) return
    const timer = window.setTimeout(onComplete, 0)
    return () => window.clearTimeout(timer)
  }, [completing, onComplete, reduced])

  useEffect(() => {
    if (flow.error) return
    const timer = window.setInterval(() => setTip((current) => (current + 1) % 3), 9_000)
    return () => window.clearInterval(timer)
  }, [flow.error])

  if (!env.NEXT_PUBLIC_USE_MOCK_API)
    return (
      <div role='status' data-generation-waiting className='flex flex-col items-center gap-4 py-8 text-center'>
        {flow.error ? (
          <AlertCircle className='text-destructive size-12' />
        ) : (
          <Loader2 aria-hidden className='text-primary size-12 animate-spin' />
        )}
        <p className='text-sm'>{flow.error ? t('error') : t('processing')}</p>
        {flow.error ? (
          <Button variant='outline' onClick={onRetry}>
            {t('retry')}
          </Button>
        ) : null}
      </div>
    )

  return (
    <div
      data-generation-waiting
      data-m08-waiting
      data-error={flow.error}
      data-long-wait={flow.longWait}
      className='flex flex-col items-center py-4 text-center'
    >
      <motion.div
        className='relative size-40'
        role='progressbar'
        aria-label={t('title')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(flow.percent)}
        animate={{ scale: completing && !reduced ? 0.88 : 1 }}
        transition={{ duration: reduced ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg viewBox='0 0 160 160' className='size-full -rotate-90'>
          <circle cx='80' cy='80' r='68' fill='none' strokeWidth='10' className='stroke-muted' />
          <circle
            cx='80'
            cy='80'
            r='68'
            fill='none'
            strokeWidth='10'
            strokeLinecap='round'
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - flow.percent / 100)}
            className={flow.error ? 'stroke-destructive' : 'stroke-primary'}
          />
          {flow.percent >= 95 && !flow.error && !flow.longWait && flow.phase === 'running' ? (
            <circle
              data-m08-alive
              cx='80'
              cy='80'
              r='68'
              fill='none'
              strokeWidth='3'
              strokeDasharray={`28 ${CIRCUMFERENCE - 28}`}
              className='stroke-primary-foreground'
            />
          ) : null}
        </svg>
        <AnimatePresence initial={false} mode='wait'>
          {completing ? (
            <motion.svg
              key='completion-check'
              viewBox='0 0 64 64'
              className='text-primary absolute inset-0 m-auto size-20'
              fill='none'
              stroke='currentColor'
              strokeWidth='5'
              initial={reduced ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
            >
              <motion.path
                d='M18 32 L28 42 L47 22'
                strokeLinecap='round'
                strokeLinejoin='round'
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduced ? 0 : 0.38, delay: reduced ? 0 : 0.18 }}
                onAnimationComplete={reduced ? undefined : onComplete}
              />
            </motion.svg>
          ) : (
            <motion.span
              key='progress-percent'
              className={cn(
                'absolute inset-0 flex items-center justify-center gap-0.5 font-bold tabular-nums',
                flow.error ? 'text-destructive' : 'text-primary-strong'
              )}
              exit={reduced ? undefined : { opacity: 0, scale: 0.94 }}
              transition={{ duration: reduced ? 0 : 0.18 }}
            >
              <span className='text-4xl'>{Math.round(flow.percent)}</span>
              <span className='text-lg'>%</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      <h2 className='mt-6 text-xl font-semibold tracking-tight text-balance'>{t('title')}</h2>
      <ol className='mt-6 w-full space-y-4 text-left'>
        {flow.rows.map((row, index) => {
          const total = row.key === 'drawings' ? 8 : 4
          const done = row.state === 'done'
          const pending = row.state === 'pending'
          const label =
            row.key === 'package'
              ? t('tasks.package')
              : t(`tasks.${row.key}`, {
                  done: Math.min(total, Math.floor((row.percent / 100) * total)),
                  total
                })
          return (
            <motion.li
              key={row.key}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced || flow.error ? 0 : 0.28,
                delay: reduced || flow.error ? 0 : index * 0.2
              }}
              className='space-y-2'
            >
              <div className='flex items-center justify-between gap-3'>
                <span className={cn('text-sm', pending ? 'text-muted-foreground' : 'text-foreground')}>{label}</span>
                {row.state === 'error' ? (
                  <AlertCircle className='text-destructive size-5 shrink-0' />
                ) : done ? (
                  <span
                    data-render-check
                    className='bg-accent text-primary-strong flex size-6 items-center justify-center rounded-full'
                  >
                    <Check className='size-3.5' strokeWidth={3} />
                  </span>
                ) : pending ? (
                  <span className='bg-muted text-muted-foreground shrink-0 rounded-md px-2 py-0.5 text-xs font-medium'>
                    {t('pending')}
                  </span>
                ) : (
                  <ProgressPercent value={row.percent} reduced={reduced} frozen={flow.error} />
                )}
              </div>
              <div className='bg-muted h-2 overflow-hidden rounded-full'>
                <div
                  className={cn('h-full rounded-full', row.state === 'error' ? 'bg-destructive' : 'bg-primary')}
                  style={{ width: `${row.percent}%` }}
                />
              </div>
            </motion.li>
          )
        })}
      </ol>
      <div
        data-render-tip
        className='bg-warning/12 border-warning/30 mt-5 flex w-full gap-2.5 rounded-xl border p-3.5 text-left text-sm'
      >
        <Lightbulb className='text-warning-strong mt-0.5 size-4 shrink-0' />
        <div className='grid min-w-0 flex-1 overflow-hidden'>
          {[0, 1, 2].map((index) => (
            <span key={index} aria-hidden style={{ gridArea: '1 / 1' }} className='invisible text-pretty'>
              <span className='font-medium'>{t('tipLabel')}</span> {t(`tips.${index}`)}
            </span>
          ))}
          <AnimatePresence initial={false} mode='wait'>
            <motion.p
              key={tip}
              style={{ gridArea: '1 / 1' }}
              initial={{ opacity: 0, y: reduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -12 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
            >
              <span className='font-medium'>{t('tipLabel')}</span> {t(`tips.${tip}`)}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      {chatStream}
      {flow.error ? (
        <div
          role='alert'
          className='border-destructive/35 bg-destructive/5 mt-5 w-full rounded-xl border p-4 text-left'
        >
          <p className='text-destructive flex items-start gap-2 text-sm font-medium'>
            <AlertCircle className='size-4 shrink-0' />
            {t('error')}
          </p>
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Button className='mt-3' variant='outline' size='sm' onClick={onRetry}>
              {t('retry')}
            </Button>
          </motion.div>
        </div>
      ) : null}
    </div>
  )
}
