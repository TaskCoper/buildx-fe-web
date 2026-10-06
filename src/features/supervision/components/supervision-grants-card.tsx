'use client'

import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ROUTES } from '@/shared/constants/routes'
import { formatDisplayDate } from '@/shared/utils'
import { supervisionGrantsApi } from '../api/supervision-grants.api'
import { supervisionKeys } from '../api/supervision.keys'
import { grantStatusOf, sortGrants } from '../services/supervision-grant.logic'

/** Số gói hiện tối đa trong cột hẹp; gói cũ hơn nằm ở trang Công trình của tôi. */
const MAX_SHOWN = 3

/**
 * Thẻ "Gói giám sát của tôi" ở cột trái trang Tài khoản — dữ liệu thật từ BE (`GET /me/supervision-grants`).
 * Chưa mua gói nào thì là lời mời chọn cách quản lý thi công (R8: link thẳng tới tab Gói giám sát, không popup).
 * Gói chưa gán thì nhắc hạn gán và dẫn sang Công trình của tôi, nơi gán gói vào công trình.
 */
export function SupervisionGrantsCard() {
  const t = useTranslations('supervision.account')
  const g = useTranslations('supervision.account.grants')
  const locale = useLocale() as Locale
  const { data, isPending, isError } = useQuery({
    queryKey: supervisionKeys.grants(),
    queryFn: () => supervisionGrantsApi.list(),
    staleTime: 60_000
  })

  if (isPending) return <Skeleton className='h-40 rounded-xl' />
  // Lỗi tải thì không dựng gì: một thẻ rỗng còn tệ hơn không có thẻ.
  if (isError) return null

  const grants = sortGrants(data).slice(0, MAX_SHOWN)

  if (grants.length === 0) {
    return (
      <section className='bg-card space-y-3 rounded-xl border border-dashed p-4'>
        <p className='text-muted-foreground text-sm text-pretty'>{t('selfManaged')}</p>
        <Button asChild variant='outline' className='w-full'>
          <Link href={ROUTES.PLANS_SUPERVISION}>{t('chooseManagement')}</Link>
        </Button>
      </section>
    )
  }

  return (
    <section className='border-brand-orange/40 bg-brand-orange-soft/50 space-y-3 rounded-xl border p-4'>
      <h2 className='text-brand-orange flex items-center gap-1.5 max-md:text-xs text-[11px] font-semibold tracking-wide uppercase'>
        <ShieldCheck className='size-3.5' />
        {g('title')}
      </h2>
      <ul className='space-y-3'>
        {grants.map((grant) => {
          const status = grantStatusOf(grant)
          return (
            <li key={grant.grantId} className='bg-card/70 space-y-1 rounded-lg border p-3'>
              <p className='text-sm font-semibold'>{g(`status.${status}`)}</p>
              <p className='text-muted-foreground text-xs text-pretty'>
                {status === 'assigned' || status === 'completed'
                  ? g('site', { name: grant.constructionSiteName ?? '—' })
                  : status === 'assignable'
                    ? g('deadline', { date: formatDisplayDate(grant.assignmentDeadlineUtc, locale) })
                    : g('grantedAt', { date: formatDisplayDate(grant.grantedAtUtc, locale) })}
              </p>
              {status === 'assignable' ? (
                <Button asChild size='sm' variant='outline' className='mt-1 w-full'>
                  <Link href={ROUTES.ACCOUNT_SITES}>{g('assign')}</Link>
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
