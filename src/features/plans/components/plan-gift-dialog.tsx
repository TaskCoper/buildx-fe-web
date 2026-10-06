'use client'

import { Gift, Info } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { RefObject } from 'react'

import type { Locale } from '@/i18n/routing'
import { Photo } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/components/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { formatCurrency } from '@/shared/utils'
import { giftValueInMillions } from '../services/plan-gift.service'
import type { PlanView } from '../types/plan.types'

interface PlanGiftDialogProps {
  /** Gói đang mở popup quà tặng; `null` là đóng. */
  plan: PlanView | null
  open?: boolean
  onClose: () => void
  origin?: RefObject<HTMLButtonElement | null>
}

/** In đậm, màu cam số tiền (vd. "3.990.000đ") trong dòng ưu đãi thêm. */
function emphasizeAmount(text: string) {
  return text.split(/(\d[\d.,]*\s?đ)/).map((part, i) =>
    i % 2 ? (
      <strong key={i} className='text-brand-orange font-bold'>
        {part}
      </strong>
    ) : (
      part
    )
  )
}

/**
 * S02 — Popup "Quà tặng đặc biệt".
 *
 * Đây là popup thật (nền mờ + nút đóng), khác với "popup 3 lựa chọn" của S08 —
 * cái đó bản mô tả gọi là popup nhưng vẽ ra là một phần của trang.
 *
 * Dựng theo Hình S02: nền kem, một DẢI RUY BĂNG cam vắt ngang đầu popup mang
 * dòng "QUÀ TẶNG ĐẶC BIỆT", tên quà in đậm, rồi CON SỐ giá trị quà cỡ rất lớn
 * màu cam tách khỏi đơn vị tiền. Bản dựng trước đây là hộp thoại trắng phẳng
 * tông vàng hổ phách nên không nhận ra là cùng một thiết kế.
 *
 * Nội dung quà tặng nằm trong bản ghi gói ở kho nội dung nên admin sửa được;
 * popup chỉ dựng lại, không giữ chữ riêng.
 */
export function PlanGiftDialog({ plan, open, onClose, origin }: PlanGiftDialogProps) {
  const t = useTranslations('plans.gift')
  const locale = useLocale() as Locale
  const gift = plan?.gift

  // Ảnh (và cả bản mô tả S02) viết giá trị quà theo TRIỆU: "100" cỡ rất lớn,
  // "TRIỆU ĐỒNG" nhỏ bên dưới. Chỉ rút gọn khi số chia hết cho một triệu; quà
  // có giá trị lẻ thì in đầy đủ để không làm tròn sai.
  const millions = gift ? giftValueInMillions(gift.value) : null
  const valueNumber = gift ? (millions ?? formatCurrency(gift.value, locale)) : ''
  const valueUnit = millions ? t('valueMillionsUnit') : ''

  return (
    <Dialog open={open ?? Boolean(gift)} onOpenChange={(nextOpen) => (nextOpen ? undefined : onClose())}>
      <DialogContent
        ref={(node) => {
          if (!node || !origin?.current) return
          const source = origin.current.getBoundingClientRect()
          const width = node.offsetWidth,
            height = node.offsetHeight
          node.style.setProperty('--gift-x', `${source.x + source.width / 2 - innerWidth / 2}px`)
          node.style.setProperty('--gift-y', `${source.y + source.height / 2 - innerHeight / 2}px`)
          node.style.setProperty('--gift-sx', String(source.width / width))
          node.style.setProperty('--gift-sy', String(source.height / height))
        }}
        onCloseAutoFocus={(event) => {
          if (origin?.current) {
            event.preventDefault()
            origin.current.focus({ preventScroll: true })
          }
        }}
        className={cn(
          'plan-gift-dialog max-h-[92vh] gap-0 overflow-y-auto bg-[oklch(0.985_0.012_75)] p-0 sm:max-w-2xl',
          // Hình S02: nút đóng là một VÒNG TRÒN TRẮNG có bóng, không phải dấu ✕ trần.
          '[&>[data-slot=dialog-close]]:bg-card [&>[data-slot=dialog-close]]:text-foreground [&>[data-slot=dialog-close]]:flex [&>[data-slot=dialog-close]]:size-7 [&>[data-slot=dialog-close]]:items-center [&>[data-slot=dialog-close]]:justify-center [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:opacity-100 [&>[data-slot=dialog-close]]:shadow-md'
        )}
      >
        {gift ? (
          <>
            {/* Dải ruy-băng cam vắt ngang đầu popup mang dòng "QUÀ TẶNG ĐẶC BIỆT". */}
            <div className='flex justify-center px-6 pt-6'>
              <span
                aria-hidden
                className='bg-brand-orange/70 h-11 w-10 [clip-path:polygon(0_0,100%_0,100%_100%,0_72%)]'
              />
              <DialogTitle className='bg-brand-orange text-brand-orange-foreground -mx-px flex items-center gap-2.5 px-8 py-2.5 text-base font-bold tracking-wide uppercase'>
                <Gift className='plan-dialog-gift size-5' />
                {t('badge')}
              </DialogTitle>
              <span
                aria-hidden
                className='bg-brand-orange/70 h-11 w-10 [clip-path:polygon(0_0,100%_0,100%_72%,0_100%)]'
              />
            </div>

            <div className='space-y-3 px-5 pt-4 pb-5 sm:px-6'>
              {/* Hàng trên: ảnh quà bên trái; tên quà + mô tả + khối "TRỊ GIÁ" bên phải
                  (xếp dọc trên điện thoại). */}
              <div className='grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]'>
                <div className='aspect-[4/3] overflow-hidden rounded-xl'>
                  {gift.imageUrl ? (
                    <Photo
                      src={gift.imageUrl}
                      alt={gift.title}
                      className='size-full'
                      sizes='(max-width: 640px) 90vw, 320px'
                    />
                  ) : (
                    <div className='border-brand-orange/30 bg-brand-orange-soft/40 relative size-full rounded-xl border-2 border-dashed'>
                      <span className='text-brand-orange/70 absolute inset-x-0 bottom-3 text-center max-md:text-xs text-[11px] font-medium'>
                        {t('imageSlot')}
                      </span>
                    </div>
                  )}
                </div>

                <div className='min-w-0 space-y-3'>
                  <div>
                    <DialogDescription className='text-foreground text-base font-bold text-pretty'>
                      {gift.title}
                    </DialogDescription>
                    {gift.description ? (
                      <p className='text-muted-foreground mt-1 text-sm text-pretty'>{gift.description}</p>
                    ) : null}
                  </div>

                  <div className='bg-brand-orange-soft rounded-2xl px-4 py-3 text-center'>
                    <p className='text-brand-orange text-sm font-bold tracking-wide uppercase'>{t('valuePrefix')}</p>
                    <p className='text-brand-orange text-6xl leading-none font-extrabold tracking-tight tabular-nums'>
                      {valueNumber}
                    </p>
                    {valueUnit ? (
                      <p className='text-brand-orange mt-1 text-lg font-bold tracking-wide uppercase'>{valueUnit}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Khối "ƯU ĐÃI THÊM": nền cam nhạt, icon hộp quà trong vòng tròn trắng. */}
              {gift.extraBody ? (
                <section className='bg-brand-orange-soft flex items-center gap-4 rounded-2xl p-4'>
                  <span className='bg-card text-brand-orange flex size-14 shrink-0 items-center justify-center rounded-full shadow-sm'>
                    <Gift className='size-8' strokeWidth={2.25} />
                  </span>
                  <div className='min-w-0'>
                    <p className='text-brand-orange text-base font-bold tracking-wide uppercase'>{t('extraTitle')}</p>
                    <p className='mt-1.5 text-sm leading-relaxed text-pretty'>{emphasizeAmount(gift.extraBody)}</p>
                  </div>
                </section>
              ) : null}

              <Button className='brand-green-button h-12 w-full text-base' onClick={onClose}>
                {t('understood')}
              </Button>

              <p className='text-muted-foreground flex items-start gap-2 text-xs'>
                <Info className='mt-0.5 size-3.5 shrink-0' />
                <span className='text-pretty'>{gift.conditions}</span>
              </p>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
