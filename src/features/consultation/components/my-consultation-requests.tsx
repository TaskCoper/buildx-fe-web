'use client'

import { CalendarDays, Clock3, Phone } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { EmptyState, ErrorState } from '@/shared/components/common'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ROUTES, consultantRoute } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDate } from '@/shared/utils'
import { useMyConsultationRequests } from '../hooks/use-consultation'
import type { ConsultationRequestItem, ConsultationRequestStatus } from '../types/consultation.types'

const STATUS_TONE: Record<ConsultationRequestStatus, string> = {
  Pending: 'bg-warning/20 text-warning-strong',
  Resolved: 'bg-primary/10 text-primary-strong'
}

function initialsOf(name: string): string {
  return name
    .replace(/^KTS\.\s*/i, '')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

/**
 * Lịch tư vấn 1:1 của khách (Tài khoản → Lịch tư vấn), đọc `GET /me/consultation-requests`.
 *
 * Chỉ xem: BE không có thao tác sửa hay hủy, và giờ ghi ở đây là giờ khách MONG MUỐN — admin gọi lại ngoài hệ
 * thống để thống nhất lịch (BR-CONSULT-006). Trạng thái chỉ có hai mức: chờ liên hệ (Pending) và đã xử lý (Resolved);
 * "đã xử lý" không có nghĩa buổi tư vấn đã diễn ra, nên câu chữ không nói như vậy.
 */
export function MyConsultationRequests() {
  const t = useTranslations('account.consultationRequests')
  const locale = useLocale() as Locale
  const query = useMyConsultationRequests()

  if (query.isPending) {
    return (
      <div className='space-y-3' aria-busy>
        <Skeleton className='h-16 rounded-xl' />
        <Skeleton className='h-28 rounded-xl' />
        <Skeleton className='h-28 rounded-xl' />
      </div>
    )
  }

  if (query.isError) {
    return (
      <ErrorState
        title={t('error.title')}
        description={t('error.description')}
        retryLabel={t('error.retry')}
        onRetry={() => void query.refetch()}
      />
    )
  }

  const items = query.data.pages.flatMap((page) => page.items)
  const total = query.data.pages[0]?.totalCount ?? items.length

  return (
    <div className='space-y-4'>
      <section className='border-primary/30 bg-primary/5 rounded-xl border p-4'>
        <p className='text-sm leading-relaxed text-pretty'>
          <Clock3 className='text-primary mr-1.5 inline size-4 -translate-y-px' />
          {t('note')}
        </p>
        <Button asChild size='sm' className='mt-3 h-8 text-xs'>
          <Link href={ROUTES.CONSULT}>
            <CalendarDays className='size-3.5' />
            {t('bookNew')}
          </Link>
        </Button>
      </section>

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t('empty.title')}
          description={t('empty.description')}
          action={
            <Button asChild>
              <Link href={ROUTES.CONSULT}>{t('empty.action')}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className='text-muted-foreground text-xs'>{t('total', { count: total })}</p>
          <ul className='space-y-3'>
            {items.map((item) => (
              <RequestRow key={item.id} item={item} locale={locale} />
            ))}
          </ul>
          {query.hasNextPage ? (
            <div className='flex justify-center'>
              <Button variant='outline' disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
                {query.isFetchingNextPage ? t('loadingMore') : t('loadMore')}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function RequestRow({ item, locale }: { item: ConsultationRequestItem; locale: Locale }) {
  const t = useTranslations('account.consultationRequests')

  return (
    <li data-consultation-request={item.id} className='bg-card rounded-xl border p-4'>
      <div className='flex flex-wrap items-start gap-3'>
        <Avatar className='size-12 shrink-0'>
          {item.architectAvatarUrl ? <AvatarImage src={item.architectAvatarUrl} alt='' /> : null}
          <AvatarFallback className='bg-accent text-primary-strong text-xs font-semibold'>
            {initialsOf(item.architectName)}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <Link href={consultantRoute(item.architectId)} className='font-semibold hover:underline'>
              {item.architectName}
            </Link>
            {item.architectTitle ? (
              <span className='bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px] max-md:text-xs'>
                {item.architectTitle}
              </span>
            ) : null}
            <span
              data-request-status={item.status}
              className={cn(
                'inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium max-md:text-xs',
                STATUS_TONE[item.status]
              )}
            >
              {t(`status.${item.status}`)}
            </span>
          </div>

          <p className='text-primary-strong mt-1 text-sm font-semibold'>
            {t('desired')}: {formatDisplayDate(item.desiredAtUtc, locale, { weekday: true, time: true })}
          </p>
          <p className='text-muted-foreground mt-1 flex items-center gap-1.5 text-xs'>
            <Phone className='size-3.5' />
            {t('contactPhone')}: {item.contactPhone}
          </p>

          {item.message ? (
            <div className='bg-muted/60 mt-3 rounded-lg px-3 py-2.5'>
              <p className='text-muted-foreground text-[11px] font-medium max-md:text-xs'>{t('yourNote')}</p>
              <p className='mt-1 text-xs leading-relaxed text-pretty whitespace-pre-line'>{item.message}</p>
            </div>
          ) : null}

          <p className='text-muted-foreground mt-3 text-[11px] max-md:text-xs'>
            {t('sentAt', { time: formatDisplayDate(item.createdOnUtc, locale, { time: true }) })}
          </p>
        </div>
      </div>
    </li>
  )
}
