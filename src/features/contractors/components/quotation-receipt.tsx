'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { HotlineLink, ProjectManagementOptionsDialog } from '@/shared/components/common'
import { useContractor } from '../hooks/use-contractors'
import { ContractorLogo } from './contractor-logo'
import { ContractorStats } from './contractor-stats'
import { Button } from '@/shared/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import { contractorFirmRoute, contractorInvitationsRoute, contractorMatchesRoute } from '@/shared/constants/routes'
import { QuotationDossier, QUOTATION_STATUSES, type QuotationItem } from '@/shared/quotations'
import { useBrief } from '../hooks/use-brief'
import { useQuotationDetail, useQuotations } from '../hooks/use-quotations'
import { ProjectContextBar } from './project-context-bar'

export function QuotationReceipt({ projectId, requestId }: { projectId: string; requestId?: string }) {
  const t = useTranslations('contractors.rfq')
  const invitationText = useTranslations('contractors.invitations')
  const { data: brief } = useBrief(projectId)
  const list = useQuotations(projectId, true, true)
  const receipt = useQuotationDetail(requestId ?? '')
  const [managementOpen, setManagementOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const detail = useQuotationDetail(selected ?? '')
  // Receipt route must belong to the selected site's list before showing private data.
  const items = requestId
    ? list.data?.requests.items.filter((item) => item.id === requestId)
    : list.data?.requests.items
  const failure = list.isError || (requestId && (receipt.isError || (list.data && !items?.length)))
  return (
    <div className='mx-auto max-w-7xl space-y-6 px-4 py-8'>
      <ProjectContextBar brief={brief} />
      <header className='space-y-2 text-center'>
        <h1 className='text-2xl font-semibold'>{requestId ? t('sentTitle') : t('title')}</h1>
        <p className='text-muted-foreground'>{t('supportHint')}</p>
      </header>
      {failure ? (
        <div role='alert' className='space-y-3'>
          <p>{t('loadFailed')}</p>
          <Button
            onClick={() => {
              void list.refetch()
              void receipt.refetch()
            }}
          >
            {t('retry')}
          </Button>
        </div>
      ) : list.siteRequired ? (
        <p role='status'>{t('siteRequired')}</p>
      ) : list.isPending || (requestId && receipt.isPending) ? (
        <p role='status'>{t('loading')}</p>
      ) : (
        <>
          {list.data ? (
            <p>{t('count', { used: list.data.used, limit: list.data.limit, remaining: list.data.remaining })}</p>
          ) : null}
          {requestId && receipt.data ? (
            <section className='bg-card space-y-2 rounded-2xl border p-4 text-sm'>
              <p>
                {t('phone')}: {receipt.data.contactPhone}
              </p>
              <p className='whitespace-pre-wrap break-words'>
                {t('note')}: {receipt.data.surveyNote || '—'}
              </p>
              <p>{receipt.data.snapshot.profile.address.formattedAddress}</p>
              <p>
                {t('snapshot', {
                  version: receipt.data.snapshot.siteVersion,
                  count: receipt.data.snapshot.attachments.length
                })}
              </p>
            </section>
          ) : null}
          <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]'>
            <div className='space-y-4'>
              {' '}
              {!items?.length ? (
                <p>{t('empty')}</p>
              ) : (
                items.map((item) => (
                  <QuotationCard
                    key={item.id}
                    item={item}
                    projectId={projectId}
                    onDetail={() => setSelected(item.id)}
                  />
                ))
              )}
            </div>
            <aside className='space-y-4 lg:sticky lg:top-24'>
              <section className='bg-card space-y-3 rounded-2xl border p-4'>
                <h2 className='font-semibold'>{invitationText('meaningTitle')}</h2>
                <dl className='space-y-3 text-sm'>
                  {QUOTATION_STATUSES.map((status) => (
                    <div key={status}>
                      <dt className='font-medium'>{t(`states.${status}`)}</dt>
                      <dd className='text-muted-foreground'>{t(`meanings.${status}`)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section className='bg-card space-y-3 rounded-2xl border p-4'>
                <h2 className='font-semibold'>{invitationText('dossierTitle')}</h2>
                <p className='text-muted-foreground text-sm'>{t('snapshotHint')}</p>
              </section>
              <section className='bg-card space-y-3 rounded-2xl border p-4'>
                <h2 className='font-semibold'>{invitationText('supportTitle')}</h2>
                <p className='text-muted-foreground text-sm'>{t('supportHint')}</p>
                <HotlineLink>{invitationText('contactDialogCall')}</HotlineLink>
              </section>
            </aside>
          </div>
        </>
      )}
      <div className='flex flex-wrap gap-3'>
        <Button asChild variant='outline'>
          <Link href={contractorMatchesRoute(projectId)}>{t('back')}</Link>
        </Button>
        {requestId ? (
          <Button asChild>
            <Link href={contractorInvitationsRoute(projectId)}>{t('trackAll')}</Link>
          </Button>
        ) : null}
      </div>
      <Button variant='outline' onClick={() => setManagementOpen(true)}>
        {t('chooseManagement')}
      </Button>
      <ProjectManagementOptionsDialog open={managementOpen} onOpenChange={setManagementOpen} projectId={projectId} />
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <SheetContent className='w-full overflow-y-auto sm:max-w-2xl'>
          <SheetHeader>
            <SheetTitle>{t('detailTitle')}</SheetTitle>
            <SheetDescription>{t('snapshotHint')}</SheetDescription>
          </SheetHeader>
          <div className='space-y-4 px-4 pb-6'>
            {detail.isError ? (
              <div role='alert'>
                <p>{t('loadFailed')}</p>
                <Button onClick={() => void detail.refetch()}>{t('retry')}</Button>
              </div>
            ) : detail.isPending ? (
              <p>{t('loading')}</p>
            ) : detail.data ? (
              <>
                <p>
                  {t('phone')}: {detail.data.contactPhone}
                </p>
                <p className='whitespace-pre-wrap break-words'>
                  {t('note')}: {detail.data.surveyNote || '—'}
                </p>
                <QuotationDossier detail={detail.data} />
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
function QuotationCard({
  item,
  projectId,
  onDetail
}: {
  item: QuotationItem
  projectId: string
  onDetail: () => void
}) {
  const t = useTranslations('contractors.rfq')
  const rating = useTranslations('contractors.rating')
  const { data: contractor } = useContractor(item.contractorId)
  const format = useFormatter()
  const date = (value: string) =>
    format.dateTime(new Date(value), { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })
  return (
    <article className='bg-card space-y-4 rounded-2xl border p-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        {contractor ? <ContractorLogo contractor={contractor} className='size-14 rounded-lg' /> : null}
        <div className='min-w-0 flex-1'>
          <h2 className='font-semibold'>{item.contractorName}</h2>
          {contractor ? <ContractorStats contractor={contractor} dense className='mt-1' /> : null}
        </div>
        <span className='bg-accent text-primary-strong rounded-full px-3 py-1 text-sm'>
          {t(`states.${item.status}`)}
        </span>
      </div>
      <dl className='grid gap-3 text-sm sm:grid-cols-3'>
        <div>
          <dt className='text-muted-foreground'>{t('sentAt')}</dt>
          <dd>{date(item.createdAtUtc)}</dd>
        </div>
        <div>
          <dt className='text-muted-foreground'>{t('desired')}</dt>
          <dd>{date(item.desiredAtUtc)}</dd>
        </div>
        <div>
          <dt className='text-muted-foreground'>{t('appointment')}</dt>
          <dd>{date(item.appointmentAtUtc)}</dd>
        </div>
      </dl>
      <ol className='grid gap-2 text-xs sm:grid-cols-4'>
        {QUOTATION_STATUSES.map((status) => (
          <li
            key={status}
            className={
              status === item.status
                ? 'border-primary bg-accent rounded-lg border p-2 font-semibold'
                : 'text-muted-foreground rounded-lg border p-2'
            }
            aria-current={status === item.status ? 'step' : undefined}
          >
            {t(`states.${status}`)}
          </li>
        ))}
      </ol>
      <div className='flex flex-wrap gap-2'>
        <Button variant='outline' onClick={onDetail}>
          {t('viewSent')}
        </Button>
        {contractor ? (
          <Button variant='outline' asChild>
            <Link href={contractorFirmRoute(projectId, item.contractorId)}>{t('profile')}</Link>
          </Button>
        ) : null}
        {item.status === 'Completed' ? (
          <Button variant='outline' disabled title={t('reviewUnavailable')}>
            {rating('action')}
          </Button>
        ) : null}
      </div>
      {item.status === 'Completed' ? <p className='text-muted-foreground text-xs'>{t('reviewUnavailable')}</p> : null}
    </article>
  )
}
