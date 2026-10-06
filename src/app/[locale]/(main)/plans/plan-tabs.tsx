'use client'

import { ArrowRight, HardHat, PencilRuler } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react'

import { usePlans } from '@/features/plans'
import { useSupervisionPackages } from '@/features/supervision'
import { Link, useRouter } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { useCmsCollection } from '@/shared/cms'
import { ROUTES } from '@/shared/constants/routes'
import { usePageEntrance } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { formatPriceTag } from '@/shared/utils'

interface PlanTabsProps {
  active: 'design' | 'supervision'
}

/**
 * Tab chuyển "Gói thiết kế | Gói giám sát" trên trang Bảng giá (S01 và S19).
 *
 * Hai tab là hai ĐƯỜNG DẪN chứ không phải state của một trang: nút "Chọn cách
 * quản lý thi công" ở khu dự án phải link thẳng vào tab Gói giám sát (R8), mà
 * link thẳng chỉ làm được khi tab có địa chỉ riêng.
 *
 * Góp ý BuildX (phương án "Hai thẻ lớn" đã chốt 23/09): thay hai nút viên thuốc
 * nhỏ bằng HAI THẺ LỚN — icon, mô tả ngắn, giá "từ …" và số gói lấy thẳng từ kho
 * gói (admin đổi giá là thẻ đổi theo); thẻ đang xem nền xanh đậm. Bên dưới là dòng
 * "Đang xem … · Chuyển sang … →".
 */
export function PlanTabs({ active }: PlanTabsProps) {
  const t = useTranslations('plans.tabs')
  const locale = useLocale() as Locale
  // Gói THIẾT KẾ đọc từ feature `plans` (BMT API → mock khi rỗng); gói GIÁM SÁT
  // vẫn đọc kho CMS vì API chưa đủ trường cho thẻ giám sát.
  const { data: apiPlans } = usePlans()
  const cmsPlans = useCmsCollection('plans')
  const designPlans = apiPlans && apiPlans.length > 0 ? apiPlans : cmsPlans
  const supervisionPackages = useSupervisionPackages()
  const router = useRouter()
  const { rootRef, entranceState, entranceStyle } = usePageEntrance('plans.tabs')
  const busy = useRef(false)
  const [isChanging, setIsChanging] = useState(false)
  const [visualActive, setVisualActive] = useState(active)
  const reduceMotion = Boolean(useReducedMotion())
  const displayedActive = isChanging ? visualActive : active

  useLayoutEffect(() => {
    document.dispatchEvent(new Event('plan-content-ready'))
  }, [])

  async function changeTab(event: MouseEvent<HTMLAnchorElement>, key: string, href: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    if (key === active || busy.current) return
    busy.current = true
    setIsChanging(true)
    const destination = Math.max(0, (rootRef.current?.getBoundingClientRect().top ?? 0) + scrollY - 72)
    if (scrollY > destination + 120) {
      window.scrollTo({ top: destination, behavior: reduceMotion ? 'auto' : 'smooth' })
      await new Promise<void>((resolve) => {
        const start = performance.now()
        const tick = () =>
          Math.abs(scrollY - destination) < 3 || performance.now() - start > 1400
            ? resolve()
            : requestAnimationFrame(tick)
        requestAnimationFrame(tick)
      })
    }
    setVisualActive(key as typeof active)
    if (!reduceMotion) await new Promise((resolve) => setTimeout(resolve, 300))
    if (!reduceMotion && document.startViewTransition) {
      document.documentElement.style.setProperty('--plan-direction', key === 'supervision' ? '1' : '-1')
      const transition = document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            const done = () => {
              clearTimeout(timeout)
              document.removeEventListener('plan-content-ready', done)
              resolve()
            }
            const timeout = setTimeout(done, 2500)
            document.addEventListener('plan-content-ready', done, { once: true })
            router.push(href, { scroll: false })
          })
      )
      await transition.finished.catch(() => undefined)
    } else {
      router.push(href, { scroll: false })
    }
    busy.current = false
    setIsChanging(false)
  }

  const sellingPlans = designPlans.filter((plan) => plan.status === 'selling')
  const paidSupervision = supervisionPackages.filter((item) => item.price > 0)
  const minPrice = (prices: number[]) => (prices.length ? Math.min(...prices) : 0)

  const tabs = [
    {
      key: 'design' as const,
      href: ROUTES.PLANS,
      icon: PencilRuler,
      label: t('design'),
      description: t('designDescription'),
      price: minPrice(sellingPlans.map((plan) => plan.price)),
      count: t('designCount', { count: sellingPlans.length }),
      isNew: false
    },
    {
      key: 'supervision' as const,
      href: ROUTES.PLANS_SUPERVISION,
      icon: HardHat,
      label: t('supervisionLong'),
      description: t('supervisionDescription'),
      price: minPrice(paidSupervision.map((item) => item.price)),
      count: t('supervisionCount', { count: paidSupervision.length }),
      isNew: true
    }
  ]
  const current = tabs.find((tab) => tab.key === displayedActive) ?? tabs[0]!
  const other = tabs.find((tab) => tab.key !== displayedActive) ?? tabs[1]!

  return (
    <div
      ref={rootRef}
      data-page-entrance={entranceState}
      style={entranceStyle}
      className='plans-tabs-enter mx-auto w-full max-w-[90rem] px-4 pt-5 lg:pt-8 lg:px-8'
    >
      <nav
        data-plan-tabs
        data-entrance-step='0'
        data-entrance-from='soft-scale'
        className='mx-auto grid w-full max-w-3xl auto-rows-fr gap-3 sm:grid-cols-2'
      >
        {tabs.map((tab) => {
          const isActive = tab.key === displayedActive
          return (
            <Link
              key={tab.key}
              href={tab.href}
              data-plan-tab={tab.key}
              aria-current={isActive ? 'page' : undefined}
              onClick={(event) => void changeTab(event, tab.key, tab.href)}
              className={cn(
                'relative flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-200',
                isActive
                  ? 'bg-primary-strong border-primary-strong text-primary-foreground shadow-md'
                  : 'bg-card border-primary/40 hover:border-primary hover:-translate-y-0.5 hover:shadow-md'
              )}
            >
              <span
                className={cn(
                  'absolute -top-2.5 right-3 rounded-full px-2 py-0.5 max-md:text-xs text-[10px] font-semibold',
                  isActive ? 'bg-card text-primary-strong' : 'bg-accent text-primary-strong'
                )}
              >
                {isActive ? t('viewing') : t('view')}
              </span>
              {tab.isNew ? (
                <span className='bg-brand-orange absolute -top-2.5 left-3 rounded-full px-2 py-0.5 max-md:text-xs text-[10px] font-semibold text-white'>
                  {t('new')}
                </span>
              ) : null}
              <span
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-xl',
                  isActive ? 'bg-primary-foreground/15' : 'bg-accent text-primary-strong'
                )}
              >
                <tab.icon className='size-5' />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block font-semibold'>{tab.label}</span>
                <span
                  className={cn(
                    'block text-xs max-md:text-sm text-pretty',
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {tab.description}
                </span>
              </span>
              <span className='shrink-0 text-right'>
                <span className='block text-sm font-bold whitespace-nowrap'>
                  {t('from', { price: formatPriceTag(tab.price, locale) })}
                </span>
                <span
                  className={cn(
                    'block max-md:text-xs text-[11px] whitespace-nowrap',
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {tab.count}
                </span>
              </span>
            </Link>
          )
        })}
      </nav>
      <p className='text-muted-foreground mt-3 text-center text-sm'>
        {t('viewingLine')} <span className='text-foreground font-semibold'>{current.label}</span>
        <span aria-hidden> · </span>
        <Link
          href={other.href}
          onClick={(event) => void changeTab(event, other.key, other.href)}
          className='text-primary-strong inline-flex items-center gap-1 font-medium underline underline-offset-4'
        >
          {t('switchTo', { name: other.label })}
          <ArrowRight className='size-3.5' />
        </Link>
      </p>
    </div>
  )
}
