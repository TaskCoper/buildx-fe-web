'use client'

import { AlertCircle, CheckCircle2, Loader2, RefreshCw, ScanSearch, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import {
  lotVerificationDisplay,
  lotVerificationFailureKind,
  type LotVerificationView
} from '../services/pipeline.logic'

interface LotVerificationStatusProps {
  view: LotVerificationView | null | undefined
  /** Đang đọc kết quả lần đầu. */
  loading: boolean
  /** Không đọc được kết quả (mạng, máy chủ). */
  loadError: boolean
  /** Đang gửi yêu cầu soi. */
  requesting: boolean
  /** Ảnh mới chưa lưu xong nên chưa soi được. */
  waitingForSave: boolean
  /** Đầu vào đang khóa: không soi ảnh mới (BR-PROJ-015 Except). */
  locked: boolean
  onRequest: () => void
  onReload: () => void
}

/**
 * Kết quả AI soi ảnh lô (BR-PROJ-015, STORY-PROJ-001/EXC-07–09): đang soi, Đạt, Không đạt kèm lý do, hoặc chưa soi
 * được (lỗi dịch vụ, hết hạn mức ngày, hệ thống đang bận). Chỉ ảnh Đạt mới chạy được chặng 2D.
 */
export function LotVerificationStatus({
  view,
  loading,
  loadError,
  requesting,
  waitingForSave,
  locked,
  onRequest,
  onReload
}: LotVerificationStatusProps) {
  const t = useTranslations('design.pipeline.verify')
  const display = lotVerificationDisplay(view)

  const box = (tone: 'muted' | 'success' | 'danger' | 'warning', icon: ReactNode, children: ReactNode) => (
    <div
      role='status'
      data-lot-verification={display}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3 text-sm',
        tone === 'success' && 'border-primary/30 bg-accent/40',
        tone === 'danger' && 'border-destructive/40 bg-destructive/5',
        tone === 'warning' && 'border-warning/40 bg-warning/10',
        tone === 'muted' && 'bg-muted/40'
      )}
    >
      <span className='mt-0.5 shrink-0'>{icon}</span>
      <div className='min-w-0 flex-1 space-y-1.5'>{children}</div>
    </div>
  )

  if (waitingForSave) return box('muted', <Loader2 className='size-4 animate-spin' />, <p>{t('waitingForSave')}</p>)
  if (loadError)
    return box(
      'warning',
      <AlertCircle className='text-warning-strong size-4' />,
      <>
        <p>{t('loadError')}</p>
        <Button type='button' size='sm' variant='outline' onClick={onReload}>
          <RefreshCw className='size-3.5' />
          {t('reload')}
        </Button>
      </>
    )
  if (loading || requesting || display === 'checking')
    return box(
      'muted',
      <Loader2 className='text-primary size-4 animate-spin' />,
      <>
        <p className='font-medium'>{t('checking')}</p>
        <p className='text-muted-foreground text-xs'>{t('checkingHint')}</p>
      </>
    )

  if (display === 'none')
    return box(
      'muted',
      <ScanSearch className='text-muted-foreground size-4' />,
      <>
        <p>{t('notChecked')}</p>
        {locked ? null : (
          <Button type='button' size='sm' variant='outline' onClick={onRequest}>
            {t('check')}
          </Button>
        )}
      </>
    )

  const remaining =
    view?.remainingToday !== null && view?.remainingToday !== undefined ? (
      <p className='text-muted-foreground text-xs'>{t('remainingToday', { count: view.remainingToday })}</p>
    ) : null

  if (display === 'pass')
    return box(
      'success',
      <CheckCircle2 className='text-primary size-4' />,
      <>
        <p className='font-medium'>{t('pass')}</p>
        {view?.reason ? <p className='text-muted-foreground'>{view.reason}</p> : null}
        {view?.reused ? <p className='text-muted-foreground text-xs'>{t('reused')}</p> : null}
        {remaining}
      </>
    )

  if (display === 'fail')
    return box(
      'danger',
      <XCircle className='text-destructive size-4' />,
      <>
        <p className='font-medium'>{t('fail')}</p>
        {view?.issues?.length ? (
          <ul className='list-disc space-y-0.5 pl-4'>
            {view.issues.map((issue) => (
              <li key={issue.code}>{issue.message || t(`issue.${issueKey(issue.code)}`)}</li>
            ))}
          </ul>
        ) : null}
        {view?.reason ? <p className='text-muted-foreground'>{view.reason}</p> : null}
        <p className='text-muted-foreground text-xs'>{t('replaceHint')}</p>
        {remaining}
      </>
    )

  // Yêu cầu soi lỗi: hết hạn mức thì chờ sang ngày; còn lại cho soi lại.
  const kind = lotVerificationFailureKind(view?.failureCode)
  return box(
    'warning',
    <AlertCircle className='text-warning-strong size-4' />,
    <>
      <p>{t(`failure.${kind}`)}</p>
      {kind === 'quota' || kind === 'invalidImage' || locked ? null : (
        <Button type='button' size='sm' variant='outline' onClick={onRequest}>
          <RefreshCw className='size-3.5' />
          {t('retry')}
        </Button>
      )}
    </>
  )
}

/** Mã vấn đề của app demo → khóa câu dự phòng khi BE không gửi kèm câu. */
function issueKey(code: string): 'not_a_plot' | 'no_layout' | 'multiple_floors' | 'other' {
  return code === 'not_a_plot' || code === 'no_layout' || code === 'multiple_floors' ? code : 'other'
}
