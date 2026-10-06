'use client'

import { ArrowRight, CircleCheck, House, Info, MapPin, Plus, Search, Trash2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { env } from '@/shared/config/env'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { revealEase } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { contractorInvitationsRoute, contractorMatchesRoute, ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDateTime } from '@/shared/utils'
import { useBriefSummaries } from '../hooks/use-brief-summaries'
import { MAX_INVITATIONS } from '../constants/contractors.constants'
import { useCreateBrief, useDeleteBrief } from '../hooks/use-brief'
import { useInvitations } from '../hooks/use-invitations'
import type { Invitation, ProjectBriefSummary } from '../types/contractor.types'

const STATUS_TONE: Record<Invitation['status'], string> = {
  sent: 'text-warning-strong',
  received: 'text-primary',
  accepted: 'text-primary',
  done: 'text-primary-strong',
  rejected: 'text-destructive'
}

const STATUS_DOT_TONE: Record<Invitation['status'], string> = {
  sent: 'bg-warning-strong',
  received: 'bg-primary',
  accepted: 'bg-primary',
  done: 'bg-primary-strong',
  rejected: 'bg-destructive'
}

function DossierRow({
  summary,
  index,
  reduceMotion
}: {
  summary: ProjectBriefSummary
  index: number
  reduceMotion: boolean
}) {
  const t = useTranslations('account.dossiers')
  const locale = useLocale() as Locale
  const { brief, invitedCount } = summary
  const { data: invitations, isPending } = useInvitations(brief.id)
  const deleteBrief = useDeleteBrief()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const orderedInvitations = [...(invitations ?? [])].sort(
    (a, b) => Date.parse(b.updatedAt ?? b.sentAt) - Date.parse(a.updatedAt ?? a.sentAt)
  )
  const latestVersion = env.NEXT_PUBLIC_USE_MOCK_API
    ? (orderedInvitations[0]?.dossierVersion ?? 'v1')
    : `v${brief.version ?? 1}`
  const detailHref = contractorInvitationsRoute(brief.id)
  const completed =
    orderedInvitations.length > 0 && orderedInvitations.every((invitation) => invitation.status === 'done')
  // Hồ sơ đã mời nhà thầu thì không cho xoá (yêu cầu sản phẩm; BE không chặn điều này).
  const invited = invitedCount > 0 || orderedInvitations.length > 0

  const address = [brief.address.wardName, brief.address.provinceName].filter(Boolean).join(', ')
  // Thông số công trình tách thành chip riêng; diện tích 0 là chưa nhập nên không in "0 m²".
  const specs = [
    brief.buildingType,
    t(`scale.${brief.scale}`),
    brief.landArea > 0 ? t('area', { area: brief.landArea }) : ''
  ].filter(Boolean)
  const statusLabel = completed
    ? t('completed')
    : invitedCount > 0
      ? t('invited', { count: invitedCount })
      : t('notInvited')
  // Mã ngắn như chỗ khác trong app ("Nhà phố (05725107)"): 8 ký tự đầu của mã, bỏ tiền tố bản nháp `local-`.
  const shortCode = brief.id
    .replace(/^local-/, '')
    .slice(0, 8)
    .toUpperCase()

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.08 + index * 0.08, ease: revealEase }}
      className='bg-card overflow-hidden rounded-2xl border shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md motion-reduce:transition-none'
    >
      <div className='flex gap-3.5 p-4 sm:gap-4 sm:p-5'>
        <div className='bg-accent text-primary-strong flex size-11 shrink-0 items-center justify-center rounded-xl'>
          <House className='size-5' strokeWidth={1.8} />
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-start justify-between gap-x-3 gap-y-2'>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 className='truncate text-base font-semibold'>{brief.name}</h3>
                <span className='bg-muted text-muted-foreground rounded-md px-2 py-0.5 max-md:text-xs text-[11px] font-medium'>
                  {brief.selfCreated ? t('source.selfCreated') : t('source.design')}
                </span>
              </div>
              {address ? (
                <p className='text-muted-foreground mt-1 flex items-center gap-1.5 text-[13px]'>
                  <MapPin className='size-3.5 shrink-0' />
                  <span className='truncate'>{address}</span>
                </p>
              ) : null}
            </div>

            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
                completed
                  ? 'bg-primary/10 text-primary-strong'
                  : invitedCount > 0
                    ? 'bg-warning/15 text-warning-strong'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {/* Ba chấm = ba lượt mời tối đa (R1): sáng bao nhiêu chấm là đã mời bấy nhiêu nhà thầu. */}
              <span aria-hidden className='flex items-center gap-0.5'>
                {Array.from({ length: MAX_INVITATIONS }, (_, slot) => (
                  <span
                    key={slot}
                    className={cn(
                      'size-1.5 rounded-full',
                      slot < invitedCount ? (completed ? 'bg-primary-strong' : 'bg-warning-strong') : 'bg-current/25'
                    )}
                  />
                ))}
              </span>
              {statusLabel}
            </span>
          </div>

          {specs.length ? (
            <ul className='mt-3 flex flex-wrap gap-1.5'>
              {specs.map((spec) => (
                <li key={spec} className='bg-muted/60 text-foreground/80 rounded-md px-2 py-1 text-xs'>
                  {spec}
                </li>
              ))}
            </ul>
          ) : null}

          <div className='mt-3'>
            {isPending ? (
              <div className='space-y-2 rounded-xl border p-3'>
                <Skeleton className='h-4 w-56' />
                {invitedCount > 1 ? <Skeleton className='h-4 w-64' /> : null}
              </div>
            ) : orderedInvitations.length > 0 ? (
              <ul className='bg-muted/30 divide-y rounded-xl border px-3'>
                {orderedInvitations.slice(0, MAX_INVITATIONS).map((invitation) => (
                  <li
                    key={invitation.id}
                    className='flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 py-2 text-[13px]'
                  >
                    <span className='flex min-w-0 items-center gap-2 font-medium'>
                      <span className={cn('size-2 shrink-0 rounded-full', STATUS_DOT_TONE[invitation.status])} />
                      <span className='truncate'>{invitation.contractorName}</span>
                    </span>
                    <span className={cn('shrink-0 text-xs font-medium', STATUS_TONE[invitation.status])}>
                      {t(`status.${invitation.status}`)}
                      {env.NEXT_PUBLIC_USE_MOCK_API
                        ? ` · ${formatDisplayDateTime(invitation.updatedAt ?? invitation.sentAt, locale)}`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className='bg-accent/50 text-primary-strong flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs'>
                <CircleCheck className='size-4 shrink-0' />
                {t('ready')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className='bg-muted/25 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-3 sm:px-5'>
        <span className='text-muted-foreground text-xs tabular-nums'>
          #{shortCode} · {latestVersion}
        </span>

        <div className='flex flex-wrap items-center gap-2'>
          {/* Bọc span để chú thích vẫn hiện khi nút bị khoá. */}
          <span title={invited ? t('deleteBlocked') : undefined}>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              disabled={invited || deleteBrief.isPending}
              onClick={() => setConfirmDelete(true)}
              className='text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-3 text-xs'
            >
              <Trash2 className='size-3.5' />
              {t('delete')}
            </Button>
          </span>

          <Button
            asChild
            variant='outline'
            size='sm'
            className='group/detail h-8 px-3 text-xs hover:bg-accent/70 motion-reduce:transition-none'
          >
            <Link href={detailHref}>
              {t('viewDetail')}
              <ArrowRight className='size-3.5 transition-transform duration-200 group-hover/detail:translate-x-0.5 motion-reduce:transform-none' />
            </Link>
          </Button>

          {invitedCount === 0 ? (
            <Button
              asChild
              size='sm'
              className='h-8 px-3 text-xs hover:brightness-[1.06] motion-reduce:transition-none'
            >
              <Link href={contractorMatchesRoute(brief.id)}>
                <Search className='size-3.5' />
                {t('findContractor')}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => (deleteBrief.isPending ? undefined : setConfirmDelete(open))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('deleteConfirmDescription', { name: brief.name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setConfirmDelete(false)}
              disabled={deleteBrief.isPending}
            >
              {t('deleteCancel')}
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={invited || deleteBrief.isPending}
              onClick={() => deleteBrief.mutate(brief.id, { onSettled: () => setConfirmDelete(false) })}
            >
              {t('deleteConfirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.article>
  )
}

/**
 * Danh sách "Hồ sơ dự án" trong Tài khoản.
 *
 * Dùng thẳng brief + invitation của feature Tìm nhà thầu thay vì tạo một bộ dữ
 * liệu Account riêng. Nhờ vậy trạng thái ở đây luôn khớp màn S18 và cả thay đổi
 * do vận hành cập nhật.
 */
export function AccountDossierList() {
  const t = useTranslations('account.dossiers')
  const { data: summaries, isPending } = useBriefSummaries()
  const createBrief = useCreateBrief()
  const reduceMotion = Boolean(useReducedMotion())
  const noteDelay = reduceMotion ? 0 : 0.28 + Math.min(summaries?.length ?? 0, 5) * 0.08

  return (
    <div className='space-y-3'>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.26, delay: 0.03, ease: revealEase }}
        className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
      >
        <p className='text-muted-foreground text-sm text-pretty'>{t('description')}</p>
        <Button
          size='sm'
          onClick={() => createBrief.mutate()}
          disabled={createBrief.isPending}
          className='shrink-0 hover:brightness-[1.06] motion-reduce:transition-none'
        >
          <Plus className='size-4' />
          {t('create')}
        </Button>
      </motion.div>

      {isPending ? (
        <div className='space-y-3'>
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className='h-[180px] w-full rounded-2xl' />
          ))}
        </div>
      ) : summaries?.length ? (
        <div className='space-y-3'>
          {summaries.map((summary, index) => (
            <DossierRow key={summary.brief.id} summary={summary} index={index} reduceMotion={reduceMotion} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.08, ease: revealEase }}
          className='bg-card rounded-xl border px-6 py-10 text-center'
        >
          <House className='text-primary mx-auto size-8' strokeWidth={1.5} />
          <p className='mt-3 font-semibold'>{t('empty.title')}</p>
          <p className='text-muted-foreground mx-auto mt-1 max-w-md text-sm text-pretty'>{t('empty.description')}</p>
          <div className='mt-5 flex flex-col justify-center gap-2.5 sm:flex-row'>
            <Button
              size='sm'
              onClick={() => createBrief.mutate()}
              disabled={createBrief.isPending}
              className='hover:brightness-[1.06] motion-reduce:transition-none'
            >
              <Plus className='size-4' />
              {t('empty.create')}
            </Button>
            <Button asChild variant='outline' size='sm' className='hover:bg-accent/70 motion-reduce:transition-none'>
              <Link href={ROUTES.PLANS}>{t('empty.viewDesignPlans')}</Link>
            </Button>
          </div>
        </motion.div>
      )}

      {!isPending ? (
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.28, delay: noteDelay, ease: revealEase }}
          className='text-muted-foreground flex items-start gap-1.5 px-0.5 max-md:text-xs text-[11px] leading-relaxed'
        >
          <Info className='mt-0.5 size-3.5 shrink-0' />
          {t('note')}
        </motion.p>
      ) : null}
    </div>
  )
}
