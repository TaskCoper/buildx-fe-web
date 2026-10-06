'use client'

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton
} from '@/shared/components/ui'
import { ChevronLeft, Headset, Info, Lock, Mail, Phone, UserPlus, UsersRound } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { EmptyState, HotlineLink, ProjectManagementOptionsDialog } from '@/shared/components/common'
import { siteConfig } from '@/shared/config'
import { contractorMatchesRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { QuotationDossier, QUOTATION_STATUSES, type QuotationItem } from '@/shared/quotations'
import { useBrief } from '../hooks/use-brief'
import { useQuotationDetail, useQuotations } from '../hooks/use-quotations'
import type { Contractor, ProjectScale } from '../types/contractor.types'
import { ContractorProfileSheet } from './contractor-profile-sheet'
import { ProjectContextBar } from './project-context-bar'
import { QuotationInvitationCard } from './quotation-invitation-card'

/** S18 keeps the original layout; RFQ supplies the quota, current state and immutable dossier. */
export function QuotationInvitationTracker({ projectId }: { projectId: string }) {
  const t = useTranslations('contractors.invitations')
  const rfq = useTranslations('contractors.rfq')
  const { data: brief } = useBrief(projectId)
  const list = useQuotations(projectId, true, true)
  const [managementOpen, setManagementOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [profile, setProfile] = useState<Contractor | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const detail = useQuotationDetail(selected ?? '')
  const items = [...(list.data?.requests.items ?? [])].sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))
  const firstItem = items[0]
  const currentStatus =
    items.length && items.every((item) => item.status === items[0]?.status) ? items[0]?.status : null
  const canShowDetail = !list.isError && items.some((item) => item.id === selected)

  return (
    <div className='mx-auto w-full max-w-[90rem] space-y-5 px-4 py-5 lg:px-8'>
      <ProjectContextBar brief={brief} />
      <Link
        href={contractorMatchesRoute(projectId)}
        className='text-primary-strong inline-flex items-center gap-1.5 text-sm font-medium'
      >
        <ChevronLeft className='size-4' />
        {t('back')}
      </Link>
      <header className='flex flex-wrap items-center justify-between gap-3'>
        <div className='min-w-0'>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('title')}</h1>
          {!list.isError && list.data && list.data.used > 0 ? (
            <p className='text-muted-foreground mt-1 text-sm text-pretty'>{t('subtitle', { count: list.data.used })}</p>
          ) : null}
        </div>
        {!list.isError && list.data && list.data.used > 0 ? (
          <div className='flex flex-wrap items-center gap-3'>
            <span className='bg-card inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm'>
              <UsersRound className='text-primary size-4' />
              <span>
                {t.rich('counter', {
                  used: list.data.used,
                  max: list.data.limit,
                  b: (chunks) => <b className='font-semibold'>{chunks}</b>
                })}
              </span>
            </span>
            {list.data.remaining > 0 ? (
              <Button asChild>
                <Link href={contractorMatchesRoute(projectId)}>
                  <UserPlus className='size-4' />
                  {t('inviteMore', { left: list.data.remaining })}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      {list.isError ? (
        <div role='alert' className='space-y-3'>
          <p>{rfq('loadFailed')}</p>
          <Button onClick={() => void list.refetch()}>{rfq('retry')}</Button>
        </div>
      ) : list.siteRequired ? (
        <p role='status'>{rfq('siteRequired')}</p>
      ) : list.isPending ? (
        <Skeleton className='h-72 rounded-2xl' />
      ) : !items.length ? (
        <EmptyState
          title={t('empty')}
          action={
            <Button asChild>
              <Link href={contractorMatchesRoute(projectId)}>{t('emptyAction')}</Link>
            </Button>
          }
        />
      ) : (
        <div className='grid gap-x-[1.6%] gap-y-5 lg:grid-cols-[70.5%_minmax(0,1fr)]'>
          <div className='min-w-0 space-y-4'>
            {items.map((item) => (
              <QuotationInvitationCard
                key={item.id}
                item={item}
                onDetail={() => setSelected(item.id)}
                onProfile={setProfile}
                onChooseManagement={() => setManagementOpen(true)}
              />
            ))}
            <p className='text-muted-foreground bg-muted/50 flex items-start gap-2.5 rounded-xl p-4 text-sm'>
              <Info className='mt-0.5 size-4 shrink-0' />
              <span className='text-pretty'>{rfq('footerNote')}</span>
            </p>
          </div>
          <aside className='space-y-4 lg:sticky lg:top-24 lg:self-start'>
            <section className='bg-card rounded-2xl border p-4'>
              <h2 className='font-semibold'>{t('meaningTitle')}</h2>
              <dl className='mt-3 space-y-2.5 text-sm'>
                {QUOTATION_STATUSES.map((status) => (
                  <div
                    key={status}
                    className={cn(
                      'relative isolate flex gap-2.5 rounded-lg',
                      status === currentStatus &&
                        'before:bg-accent/60 before:absolute before:-inset-x-1.5 before:-inset-y-0.5 before:-z-10 before:rounded-lg'
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'mt-2 size-1.5 shrink-0 rounded-full',
                        status === currentStatus ? 'bg-primary' : 'bg-muted-foreground/40'
                      )}
                    />
                    <div className='text-muted-foreground min-w-0 text-pretty'>
                      <dt className='text-foreground inline font-semibold'>{rfq(`states.${status}`)}</dt>
                      <dd className='inline'> – {rfq(`meanings.${status}`)}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>
            {firstItem ? <SentQuotationDossier item={firstItem} onView={() => setSelected(firstItem.id)} /> : null}
            <section className='bg-accent/40 flex gap-3 rounded-2xl p-4'>
              <Headset className='text-primary mt-0.5 size-5 shrink-0' />
              <div className='min-w-0'>
                <h2 className='text-primary-strong font-semibold'>{t('supportTitle')}</h2>
                <p className='text-muted-foreground mt-1 text-sm text-pretty'>{t('supportBody')}</p>
                <button
                  type='button'
                  onClick={() => setContactOpen(true)}
                  className='text-primary-strong mt-2 text-sm font-medium underline underline-offset-4'
                >
                  {t('supportAction')}
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}

      <ContractorProfileSheet contractor={profile} onOpenChange={(open) => !open && setProfile(null)} />
      <ProjectManagementOptionsDialog open={managementOpen} onOpenChange={setManagementOpen} projectId={projectId} />
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>{t('contactDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className='space-y-2.5 text-sm'>
            <HotlineLink className='hover:bg-accent flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors'>
              <Phone className='text-primary size-4 shrink-0' />
              {siteConfig.contact.hotline}
            </HotlineLink>
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className='hover:bg-accent flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors'
            >
              <Mail className='text-primary size-4 shrink-0' />
              {siteConfig.contact.email}
            </a>
          </div>
          <DialogFooter>
            <Button asChild className='w-full'>
              <HotlineLink>{t('contactDialogCall')}</HotlineLink>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className='w-full overflow-y-auto sm:max-w-2xl'>
          <SheetHeader>
            <SheetTitle>{rfq('detailTitle')}</SheetTitle>
            <SheetDescription>{rfq('snapshotHint')}</SheetDescription>
          </SheetHeader>
          <div className='space-y-4 px-4 pb-6'>
            {!canShowDetail || detail.isError ? (
              <div role='alert'>
                <p>{rfq('loadFailed')}</p>
                <Button
                  onClick={() => {
                    void list.refetch()
                    void detail.refetch()
                  }}
                >
                  {rfq('retry')}
                </Button>
              </div>
            ) : detail.isPending ? (
              <p>{rfq('loading')}</p>
            ) : detail.data ? (
              <>
                <p>
                  {rfq('phone')}: {detail.data.contactPhone}
                </p>
                <p className='whitespace-pre-wrap break-words'>
                  {rfq('note')}: {detail.data.surveyNote || '—'}
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

/** Summary of the latest invitation snapshot, never the currently editable profile. */
function SentQuotationDossier({ item, onView }: { item: QuotationItem; onView: () => void }) {
  const t = useTranslations('contractors.invitations')
  const rfq = useTranslations('contractors.rfq')
  const scale = useTranslations('contractors.scale')
  const { data, isError, isPending, refetch } = useQuotationDetail(item.id)
  const format = useFormatter()
  const profile = data?.snapshot.profile
  const floorCount = profile?.floorCount
  const floors =
    floorCount == null
      ? rfq('profileFields.notApplicable')
      : floorCount >= 1 && floorCount <= 5
        ? scale((floorCount === 1 ? 'ground' : `ground+${floorCount - 1}`) as ProjectScale)
        : rfq('floorsCount', { count: floorCount })
  const rows =
    data && profile
      ? [
          [t('dossierType'), profile.buildingType.name],
          [
            t('dossierScale'),
            `${floors}${profile.hasTum ? ` · ${rfq('profileFields.hasTum')}` : ''} · ${format.number(Number(profile.areaM2))} m²`
          ],
          [t('dossierScope'), rfq('scopeNotRecorded')],
          [t('dossierFiles'), t('dossierFileCount', { count: data.snapshot.attachments.length })]
        ]
      : []
  return (
    <section className='bg-card rounded-2xl border p-4'>
      <div className='flex items-center justify-between gap-2'>
        <h2 className='font-semibold'>{t('dossierTitle')}</h2>
        {!isError && data ? (
          <span className='border-primary/40 text-primary-strong rounded-md border px-1.5 py-0.5 text-[10px] font-medium'>
            {rfq('snapshotVersion', { version: data.snapshot.siteVersion })}
          </span>
        ) : null}
      </div>
      {isError ? (
        <div role='alert' className='mt-3 space-y-2 text-sm'>
          <p>{rfq('loadFailed')}</p>
          <Button size='sm' variant='outline' onClick={() => void refetch()}>
            {rfq('retry')}
          </Button>
        </div>
      ) : isPending ? (
        <Skeleton className='mt-3 h-28 rounded-lg' />
      ) : (
        <dl className='mt-3 space-y-2.5 text-sm'>
          {rows.map(([label, value]) => (
            <div key={label} className='flex items-start justify-between gap-3'>
              <dt className='text-muted-foreground'>{label}</dt>
              <dd className='text-right font-medium'>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <button
        type='button'
        onClick={onView}
        className='text-primary-strong mt-3 inline-block text-sm font-medium underline underline-offset-4'
      >
        {t('dossierView')}
      </button>
      <p className='text-muted-foreground bg-muted/50 mt-3 flex items-start gap-2 rounded-lg p-3 text-sm'>
        <Lock className='mt-0.5 size-3.5 shrink-0' />
        <span>{rfq('snapshotHint')}</span>
      </p>
    </section>
  )
}
