'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Textarea } from '@/shared/components/ui/textarea'
import { useStageActions } from '../hooks/use-supervision'
import type { ChangeRequest, SupervisionStage } from '../types/supervision.types'

interface ChangeRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  stage: SupervisionStage
  /** Yêu cầu của Giám sát đang chờ khách duyệt — có thì hộp thoại ở chế độ DUYỆT. */
  pending?: ChangeRequest
  onSubmitted: () => void
  submitting: boolean
}

/** `v1` → `v2`, dùng để nói trước phiên bản sẽ sinh ra nếu duyệt. */
function nextVersion(version: string): string {
  return `v${Number(version.replace('v', '')) + 1}`
}

/**
 * Hộp thoại yêu cầu sửa đổi — hai chế độ trong MỘT component:
 *
 * - DUYỆT (S22): Giám sát đề xuất, khách duyệt hoặc từ chối. Duyệt thì hồ sơ lên
 *   phiên bản mới, từ chối thì giữ nguyên — hai nút nói thẳng hệ quả đó.
 * - GỬI (S23): hồ sơ đã khóa, khách muốn bổ sung thì mô tả lý do để Giám sát duyệt.
 *
 * Không có đường nào sửa thẳng hồ sơ đã khóa (R5).
 */
export function ChangeRequestDialog({
  open,
  onOpenChange,
  projectId,
  stage,
  pending,
  onSubmitted,
  submitting
}: ChangeRequestDialogProps) {
  const t = useTranslations('supervision.dashboard.change')
  const { decideChange, requestChange } = useStageActions(projectId)
  const [reason, setReason] = useState('')

  const upcomingVersion = nextVersion(stage.version)

  const decide = (approve: boolean) =>
    decideChange.mutate(
      { stageKey: stage.key, changeRequestId: pending?.id ?? '', approve },
      {
        onSuccess: () => {
          toast.success(
            approve ? t('approved', { version: upcomingVersion }) : t('rejected', { version: stage.version })
          )
          onSubmitted()
        }
      }
    )

  const send = () => {
    if (!reason.trim()) return
    requestChange.mutate(
      { stageKey: stage.key, reason: reason.trim() },
      {
        onSuccess: () => {
          setReason('')
          toast.success(t('sent'))
          onSubmitted()
        }
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        {pending ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('dialogTitle', { code: pending.id })}</DialogTitle>
              <DialogDescription>{t('reason')}</DialogDescription>
            </DialogHeader>

            <p className='bg-muted/50 rounded-lg p-3 text-sm text-pretty'>{pending.reason}</p>

            <div className='flex flex-wrap gap-2'>
              <Button className='flex-1' onClick={() => decide(true)} disabled={decideChange.isPending}>
                {t('approve', { version: upcomingVersion })}
              </Button>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => decide(false)}
                disabled={decideChange.isPending}
              >
                {t('reject', { version: stage.version })}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('createTitle')}</DialogTitle>
              <DialogDescription className='text-pretty'>{t('createBody')}</DialogDescription>
            </DialogHeader>

            <Textarea
              rows={4}
              value={reason}
              placeholder={t('createPlaceholder')}
              onChange={(event) => setReason(event.target.value)}
            />

            <Button onClick={send} disabled={!reason.trim() || submitting || requestChange.isPending}>
              {t('send')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
