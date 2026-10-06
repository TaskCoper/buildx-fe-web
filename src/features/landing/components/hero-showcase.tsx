'use client'

import { Box, Calculator, FileText, LayoutPanelTop, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { DossierCover, Photo, PlanDrawing } from '@/shared/components/common'
import { useSiteImage } from '@/shared/cms'
import { formatNumber } from '@/shared/utils'
import { cn } from '@/shared/lib/utils'
import { SHOWCASE_TABS, type ShowcaseTab } from '../constants/landing.constants'

/** Biểu tượng cho từng tab của khung minh họa (mục II.2). */
const TAB_ICON: Record<ShowcaseTab, LucideIcon> = {
  floorPlan: LayoutPanelTop,
  render3d: Box,
  dossier: FileText,
  estimate: Calculator
}

/**
 * Dữ liệu tĩnh minh họa bảng dự toán — không gọi API. Tổng = 1.814.000.000đ.
 * `unit` trỏ tới khóa dịch trong `landing.showcase.units`.
 */
const ESTIMATE_ROWS = [
  { key: 'foundation', unit: 'area', qty: 120, amount: 216_000_000 },
  { key: 'structure', unit: 'area', qty: 360, amount: 684_000_000 },
  { key: 'finishing', unit: 'area', qty: 360, amount: 612_000_000 },
  { key: 'mep', unit: 'package', qty: 1, amount: 162_000_000 },
  { key: 'interior', unit: 'package', qty: 1, amount: 140_000_000 }
] as const

/**
 * Khung minh họa sản phẩm TƯƠNG TÁC ở cột phải hero (mục II.2).
 *
 * Card tách đôi: ảnh phối cảnh bên trái luôn hiện, panel bên phải đổi theo tab —
 * bảng dự toán, bản vẽ mặt bằng 2D, phối cảnh hoặc trang bìa hồ sơ. Dữ liệu tĩnh,
 * chuyển mượt và nhẹ. Mặc định mở tab Dự toán để khớp bản thiết kế client duyệt.
 */
export function HeroShowcase() {
  const t = useTranslations('landing.showcase')
  // Ảnh minh họa lấy từ kho nội dung — admin thay ở màn "Hình ảnh site".
  const facadeImage = useSiteImage('style.modern')
  const renderImage = useSiteImage('render.villa')
  const locale = useLocale() as Locale
  const [tab, setTab] = useState<ShowcaseTab>('estimate')

  const total = ESTIMATE_ROWS.reduce((sum, row) => sum + row.amount, 0)

  return (
    <div className='bg-card overflow-hidden rounded-2xl border shadow-xl'>
      <div className='grid items-stretch gap-5 p-5 sm:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]'>
        {/* Ảnh phối cảnh — mỏ neo "công trình của bạn", luôn hiện. */}
        <div className='bg-muted relative hidden h-full min-h-[21rem] overflow-hidden rounded-xl border sm:block'>
          <Photo
            src={facadeImage}
            alt={t('title')}
            priority
            sizes='(max-width: 1024px) 40vw, 220px'
            className='size-full'
          />
        </div>

        {/* Panel bên phải đổi theo tab. */}
        <div key={tab} className='animate-in fade-in min-w-0 duration-300'>
          {tab === 'estimate' ? (
            <div className='flex h-full flex-col'>
              <p className='text-muted-foreground mb-3 text-center text-xs font-semibold tracking-wide uppercase sm:text-sm'>
                {t('title')}
              </p>
              <table className='w-full text-xs tabular-nums sm:text-sm'>
                <thead>
                  <tr className='bg-muted text-foreground text-left'>
                    <th className='py-2.5 pr-1 pl-2.5 font-semibold'>{t('cols.item')}</th>
                    <th className='py-2.5 pr-1 text-center font-semibold'>{t('cols.unit')}</th>
                    <th className='py-2.5 pr-1 text-right font-semibold'>{t('cols.qty')}</th>
                    <th className='py-2.5 pr-2.5 text-right font-semibold'>{t('cols.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ESTIMATE_ROWS.map((row) => (
                    <tr key={row.key} className='border-b last:border-0'>
                      <td className='py-2.5 pr-1 pl-2.5 font-medium whitespace-nowrap'>{t(`rows.${row.key}`)}</td>
                      <td className='text-muted-foreground py-2.5 pr-1 text-center'>{t(`units.${row.unit}`)}</td>
                      <td className='py-2.5 pr-1 text-right'>{formatNumber(row.qty, locale)}</td>
                      <td className='py-2.5 pr-2.5 text-right'>{formatNumber(row.amount, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className='bg-primary/10 mt-4 flex items-center justify-between rounded-xl px-4 py-3'>
                <span className='text-primary-strong text-sm font-semibold tracking-wide uppercase'>
                  {t('rows.total')}
                </span>
                <span className='text-primary text-base font-bold tabular-nums sm:text-lg'>
                  {formatNumber(total, locale)} {t('currency')}
                </span>
              </div>
            </div>
          ) : null}

          {tab === 'floorPlan' ? <PlanDrawing className='aspect-4/3 size-full rounded-xl' /> : null}

          {tab === 'render3d' ? (
            <Photo
              src={renderImage}
              alt={t('tabs.render3d')}
              sizes='(max-width: 1024px) 60vw, 320px'
              className='aspect-4/3 size-full rounded-xl'
            />
          ) : null}

          {tab === 'dossier' ? <DossierCover className='aspect-4/3 size-full rounded-xl' /> : null}
        </div>
      </div>

      {/* Thanh tab — icon + nhãn, tab đang mở gạch chân màu thương hiệu. */}
      <div role='tablist' aria-label={t('label')} className='grid grid-cols-4 border-t'>
        {SHOWCASE_TABS.map((item, i) => {
          const Icon = TAB_ICON[item]
          const active = tab === item
          return (
            <button
              key={item}
              role='tab'
              type='button'
              aria-selected={active}
              onClick={() => setTab(item)}
              className={cn(
                'relative flex items-center justify-center gap-2 border-b-[1.5px] py-3.5 text-xs font-medium transition-colors sm:text-sm',
                // Vạch ngăn ngắn, canh giữa giữa các tab (không kéo hết chiều cao).
                i > 0 &&
                  'before:bg-border before:absolute before:top-1/2 before:left-0 before:h-5 before:w-px before:-translate-y-1/2 before:content-[""]',
                active
                  ? 'border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              )}
            >
              <Icon className='size-4.5' />
              <span className='hidden sm:inline'>{t(`tabs.${item}`)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
