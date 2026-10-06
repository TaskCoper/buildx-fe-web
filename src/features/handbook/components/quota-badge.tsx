'use client'

import { Check, Eye, Lock, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { Link } from '@/i18n/navigation'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'
import { useHandbookDetailQuota, useHandbookLookupQuota, useHandbookQuota } from '../hooks/use-handbook'

/**
 * Hạn mức tra cứu trong ngày (Phần 2.1, 2.3).
 *
 * `lookup` là huy hiệu ở góc phải thanh lọc của lưới thư viện; `detail` là dòng
 * nhắc trong cột phải trang chi tiết. Hết lượt thì đổi thành lời mời nâng cấp
 * gói, dẫn thẳng sang trang Gói đăng ký.
 */
export function QuotaBadge({
  scope,
  className,
  shakeNonce = 0,
  templateId,
  detailViewStatus = 'pending'
}: {
  scope: 'lookup' | 'detail'
  className?: string
  shakeNonce?: number
  templateId?: string
  detailViewStatus?: 'pending' | 'consumed' | 'seen' | 'blocked'
}) {
  const t = useTranslations('handbook.quota')
  const rawQuota = useHandbookQuota()
  const lookupQuota = useHandbookLookupQuota()
  const detailQuota = useHandbookDetailQuota()
  const previousRemainingRef = useRef<number | null>(null)
  const badgeRef = useRef<HTMLSpanElement>(null)
  const detailRef = useRef<HTMLParagraphElement>(null)
  const detailEyeRef = useRef<SVGSVGElement>(null)

  const data = rawQuota.data

  const remaining = scope === 'lookup' ? lookupQuota.remaining : detailQuota.remaining
  const total = scope === 'lookup' ? lookupQuota.total : detailQuota.total
  const lookupMonthly = scope === 'lookup' && lookupQuota.period === 'month'
  const viewedToday = scope === 'detail' && Boolean(templateId && detailQuota.hasViewed(templateId))

  useEffect(() => {
    const previous = previousRemainingRef.current
    previousRemainingRef.current = remaining
    if (previous === null || remaining >= previous) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const target = scope === 'lookup' ? badgeRef.current : detailRef.current
    target?.animate(
      [
        { boxShadow: '0 0 0 0 transparent' },
        { boxShadow: '0 0 0 3px color-mix(in oklch, var(--primary) 18%, transparent)', offset: 0.42 },
        { boxShadow: '0 0 0 0 transparent' }
      ],
      { duration: 480, easing: 'ease-out' }
    )
    if (scope === 'detail') {
      detailEyeRef.current?.animate(
        [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0.18, transform: 'scale(0.82)', offset: 0.36 },
          { opacity: 1, transform: 'scale(1)' }
        ],
        { duration: 360, easing: 'cubic-bezier(0.22,1,0.36,1)' }
      )
    }
  }, [remaining, scope])

  useEffect(() => {
    if (scope !== 'lookup' || shakeNonce <= 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    badgeRef.current?.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-5px)', offset: 0.22 },
        { transform: 'translateX(4px)', offset: 0.44 },
        { transform: 'translateX(-3px)', offset: 0.64 },
        { transform: 'translateX(2px)', offset: 0.82 },
        { transform: 'translateX(0)' }
      ],
      { duration: 420, easing: 'ease-out' }
    )
  }, [scope, shakeNonce])

  if (!data) return null
  // Gói không giới hạn: không có số lượt để hiện (tài khoản free vẫn hiện số mock 3/ngày).
  if (scope === 'detail' && data.detailMode === 'unlimited') return null

  const Icon = scope === 'lookup' ? Search : Eye

  if (scope === 'detail' && viewedToday && detailViewStatus !== 'consumed') {
    return (
      <p
        data-detail-quota-state='seen'
        className={cn('text-success flex items-center gap-2 text-xs font-medium', className)}
      >
        <Check className='size-4 shrink-0' />
        {t('detailSeen')}
      </p>
    )
  }

  if (scope === 'detail' && remaining <= 0) {
    return (
      <Link
        href={ROUTES.PLANS}
        className={cn(
          'text-destructive inline-flex items-center gap-1.5 rounded-lg border border-current/30 px-3 py-1.5 text-xs font-medium hover:underline',
          className
        )}
      >
        <Icon className='size-3.5' />
        {t('exhausted')}
      </Link>
    )
  }

  if (scope === 'detail') {
    return (
      <p
        ref={detailRef}
        data-detail-quota-state={remaining <= 1 ? 'low' : 'ok'}
        className={cn(
          'flex items-center gap-2 text-xs transition-colors',
          remaining <= 1 ? 'text-warning' : 'text-muted-foreground',
          className
        )}
      >
        <Eye ref={detailEyeRef} data-detail-quota-eye className='size-4 shrink-0' />
        <span key={remaining} data-quota-number>
          {t(data.detailMode === 'plan' ? 'detailRemainingPlan' : 'detailRemaining', { remaining, total })}
        </span>
      </p>
    )
  }

  const hours = hoursUntilMidnight()
  const exhausted = remaining <= 0
  const low = remaining === 1

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          ref={badgeRef}
          data-quota-badge
          data-quota-state={exhausted ? 'empty' : low ? 'low' : 'ok'}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-[border-color,color,background-color] duration-200',
            exhausted && 'border-muted-foreground/30 text-muted-foreground bg-muted/40',
            low && 'border-warning/50 text-warning',
            !exhausted && !low && 'border-primary/40 text-primary',
            className
          )}
        >
          {exhausted ? <Lock className='size-3.5' /> : <Icon className='size-3.5' />}
          <span key={remaining} data-quota-number>
            {lookupMonthly
              ? t('lookupRemainingMonthly', { remaining, total })
              : t('lookupRemaining', { remaining, total })}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side='bottom' sideOffset={8}>
        {lookupMonthly ? t('tooltipMonthly', { total }) : t('tooltip', { total, hours })}
      </TooltipContent>
    </Tooltip>
  )
}

function hoursUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 3_600_000))
}
