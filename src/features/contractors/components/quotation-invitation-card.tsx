'use client'

import { Button, Skeleton, Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui'
import { BadgeCheck, CalendarDays, FileText, Star } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/routing'
import { formatDisplayDate, formatDisplayDateTime, formatDisplayTime } from '@/shared/utils'
import { cn } from '@/shared/lib/utils'
import { QUOTATION_STATUSES, type QuotationItem } from '@/shared/quotations'
import { useContractor } from '../hooks/use-contractors'
import { useQuotationDetail } from '../hooks/use-quotations'
import type { Contractor } from '../types/contractor.types'
import { ContractorLogo } from './contractor-logo'
import { ContractorStats } from './contractor-stats'

const strong = (chunks: React.ReactNode) => <b className='text-foreground font-medium'>{chunks}</b>

/** S18 presentation over RFQ data. No invented INV code, update time or status history. */
export function QuotationInvitationCard({
  item,
  onDetail,
  onProfile,
  onChooseManagement
}: {
  item: QuotationItem
  onDetail: () => void
  onProfile: (contractor: Contractor) => void
  onChooseManagement: () => void
}) {
  const t = useTranslations('contractors.invitations')
  const rfq = useTranslations('contractors.rfq')
  const common = useTranslations('contractors.common')
  const rating = useTranslations('contractors.rating')
  const locale = useLocale() as Locale
  const { data: contractor } = useContractor(item.contractorId)
  const detail = useQuotationDetail(item.id)
  const stamp = (value: string) => formatDisplayDateTime(value, locale)
  const day = formatDisplayDate(item.appointmentAtUtc, locale, { weekday: true })
  const clock = formatDisplayTime(item.appointmentAtUtc, locale)
  const completed = item.status === 'Completed'

  return (
    <article
      className={cn('bg-card relative space-y-4 overflow-hidden rounded-2xl border p-4 sm:p-5', completed && 'pt-5')}
    >
      {completed ? <span aria-hidden className='bg-primary absolute inset-x-0 top-0 h-1' /> : null}
      <div className='flex flex-wrap items-start gap-4'>
        <ContractorLogo contractor={contractor ?? { name: item.contractorName }} />
        <div className='min-w-0 flex-1'>
          <h2 className='flex items-center gap-2 font-semibold'>
            <span className='break-words'>{item.contractorName}</span>
            {contractor?.verified ? <BadgeCheck className='text-primary size-4 shrink-0' /> : null}
          </h2>
          {contractor?.officeAddress ? (
            <p className='text-muted-foreground mt-1 text-sm'>
              {[contractor.kind, contractor.officeAddress].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          {contractor ? <ContractorStats contractor={contractor} dense className='mt-2' /> : null}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='bg-primary/10 text-primary-strong inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium'>
            <span aria-hidden className='bg-primary size-1.5 rounded-full' />
            {rfq(`states.${item.status}`)}
          </span>
          {contractor ? (
            <Button variant='outline' size='sm' onClick={() => onProfile(contractor)}>
              <FileText className='size-4' />
              {common('viewProfile')}
            </Button>
          ) : null}
          {completed && contractor ? (
            <Button variant='outline' size='sm' disabled title={rfq('reviewUnavailable')}>
              <Star className='size-4' />
              {rating('action')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className='text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t pt-3 text-sm'>
        <span>{t.rich('code', { code: rfq('displayCodeUnavailable'), b: strong })}</span>
        <span>{t.rich('sentAt', { time: stamp(item.createdAtUtc), b: strong })}</span>
        {detail.data ? (
          <button type='button' onClick={onDetail} title={rfq('viewSent')} className='text-left hover:underline'>
            {t.rich('dossier', {
              version: `v${detail.data.snapshot.siteVersion}`,
              count: detail.data.snapshot.attachments.length,
              b: strong
            })}
          </button>
        ) : detail.isError ? (
          <button type='button' onClick={onDetail} className='text-primary-strong underline underline-offset-4'>
            {rfq('viewSent')}
          </button>
        ) : (
          <Skeleton className='h-5 w-28' />
        )}
        <span className='sm:ml-auto'>{rfq('updatedBySupport')}</span>
      </div>

      <p className='text-muted-foreground flex items-center gap-2 text-sm'>
        <CalendarDays className='text-primary size-4 shrink-0' />
        {t('surveyAt', { date: day, slot: clock })}
      </p>
      {item.desiredAtUtc !== item.appointmentAtUtc ? (
        <p className='text-muted-foreground text-sm'>
          {rfq('desired')}: {stamp(item.desiredAtUtc)}
        </p>
      ) : null}

      <ol aria-label={t('meaningTitle')} className='flex items-start overflow-x-auto pt-3 pb-1 -mt-3'>
        {QUOTATION_STATUSES.map((status, index) => {
          const active = status === item.status
          // RFQ supports direct status changes; earlier positions are not proof of historical events.
          const at = status === 'Sent' ? item.createdAtUtc : undefined
          return (
            <li
              key={status}
              aria-current={active ? 'step' : undefined}
              className='relative flex min-w-36 flex-1 flex-col gap-2 sm:min-w-0'
            >
              {index > 0 ? (
                <span
                  aria-hidden
                  className='bg-border absolute top-3 h-0.5 -translate-y-1/2 rounded-full'
                  style={{ left: 'calc(-100% + 1.5rem)', right: 'calc(100% - 0.75rem)' }}
                />
              ) : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'relative z-10 flex size-6 items-center justify-center rounded-full border-2 bg-card',
                      active ? 'border-primary' : 'border-border'
                    )}
                  >
                    {active ? <span aria-hidden className='bg-primary size-2 rounded-full' /> : null}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{at ? stamp(at) : t('statusPending')}</TooltipContent>
              </Tooltip>
              <div className='min-w-0'>
                <p
                  className={cn(
                    'text-sm leading-tight',
                    active ? 'text-primary-strong font-medium' : 'text-muted-foreground'
                  )}
                >
                  {rfq(`states.${status}`)}
                </p>
                {at ? <p className='text-muted-foreground mt-0.5 text-sm'>{stamp(at)}</p> : null}
              </div>
            </li>
          )
        })}
      </ol>
      {completed ? (
        <div className='bg-accent/40 flex flex-wrap items-center justify-between gap-3 rounded-xl p-3.5 text-sm'>
          <span className='text-primary-strong font-medium'>{t('supervisionSuggestion')}</span>
          <Button size='sm' variant='outline' onClick={onChooseManagement}>
            {t('supervisionAction')}
          </Button>
          <p className='text-muted-foreground w-full text-xs'>{rfq('reviewUnavailable')}</p>
        </div>
      ) : null}
    </article>
  )
}
