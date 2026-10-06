'use client'

import { useState } from 'react'
import { ArrowRight, ChevronRight, HardHat, PencilRuler, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { revealEase, TurnkeyRequestDialog } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { ROUTES } from '@/shared/constants/routes'
import { useMediaQuery } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { HOME_SERVICES, type HomeService } from '../constants/landing.constants'

const SERVICE_ICON: Record<HomeService, LucideIcon> = {
  design: PencilRuler,
  contractors: Users,
  supervision: ShieldCheck,
  turnkey: HardHat
}

/**
 * Nút của từng thẻ dẫn đi đâu. `turnkey` KHÔNG có trang riêng — bản mô tả nói
 * "Đăng ký triển khai" là một form Ops gọi lại (S08), nên nó mở hộp thoại dùng
 * chung thay vì điều hướng.
 */
const SERVICE_HREF: Record<Exclude<HomeService, 'turnkey'>, string> = {
  design: ROUTES.PLANS,
  contractors: ROUTES.CONTRACTORS,
  supervision: ROUTES.PLANS_SUPERVISION
}

/**
 * Dải xanh "Gói dịch vụ SAVICO" — bốn gói, mỗi gói một việc rõ ràng.
 *
 * Bốn thẻ dàn một hàng (góp ý BuildX: bỏ ảnh minh hoạ + giấy nhớ bên phải).
 *
 * ★ Thẻ hiện lần lượt. Rê thẻ: nhấc, viền sáng, nút đầy màu, lộ dòng "Dùng ở
 * bước…" trong khoảng đã chừa sẵn (thẻ không đổi kích thước).
 */
interface HomeServicesProps {
  ownedDesignRemaining?: number
  /** Đã mua gói giám sát → nút thẻ Giám sát là "Mở gói" tới Tài khoản của tôi (góp ý BuildX). */
  ownsSupervision?: boolean
}

export function HomeServices({ ownedDesignRemaining, ownsSupervision = false }: HomeServicesProps) {
  const t = useTranslations('landing.services')
  const [turnkeyOpen, setTurnkeyOpen] = useState(false)
  const [hovered, setHovered] = useState<HomeService | null>(null)
  // Mobile cuộn ngang: thẻ kế tiếp chỉ LÓ một mép nên không đạt 40% diện tích → kẹt ở opacity 0
  // (thẻ trống) cho tới khi vuốt. `some` = chỉ cần thấy 1 pixel là hiện.
  const isMobile = useMediaQuery('(max-width: 639px)')
  const revealAmount = isMobile ? 'some' : 0.4

  return (
    <section id='home-services' className='brand-band relative isolate overflow-hidden'>
      <div className='relative mx-auto w-full max-w-[90rem] px-4 py-5 lg:px-8'>
        <header className='grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-3 lg:gap-x-10'>
          <div className='contents'>
            {/* Góp ý BuildX: bỏ nhãn "Bảng giá BuildX" — chỉ còn tiêu đề + mô tả.
                `leading-none`/`leading-5`: bỏ khoảng line-height thừa để chữ cách mép
                section và cách các thẻ đúng 20px thay vì 20px + phần thừa. */}
            <h2 className='text-2xl leading-none font-bold tracking-tight text-balance lg:text-[1.75rem]'>
              {t('title')}
            </h2>
            <p className='text-primary-foreground col-span-2 row-start-2 max-w-3xl text-sm leading-5'>
              {t('subtitle')}
            </p>
          </div>

          {/* CTA nằm trên hàng tiêu đề; mô tả luôn ở hàng tiếp theo. */}
          <p className='text-primary-foreground/80 col-start-2 row-start-1 flex items-center gap-1.5 text-sm lg:hidden'>
            {t('referenceLabel')}
            <Link
              href={ROUTES.PLANS}
              className='text-primary-foreground hover:text-primary-foreground focus-visible:text-primary-foreground inline-flex items-center gap-1 font-medium underline underline-offset-4 transition-colors'
            >
              {t('referenceLink')}
              <ChevronRight className='size-4' />
            </Link>
          </p>
          <Link
            href={ROUTES.PLANS}
            className='hover:text-primary-foreground focus-visible:text-primary-foreground col-start-2 row-start-1 hidden items-center gap-1.5 text-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:underline lg:inline-flex'
          >
            <span className='sm:hidden'>{t('viewAllMobile')}</span>
            <span className='hidden sm:inline'>{t('viewAll')}</span>
            <ChevronRight className='size-4 lg:hidden' />
            <ArrowRight className='hidden size-4 lg:block' />
          </Link>
        </header>

        <div className='mt-5'>
          {/* Dưới `sm`: 4 thẻ thành MỘT HÀNG NGANG cuộn được. Từ `sm` lưới 2 cột, `lg` đủ 4 thẻ một hàng. */}
          <ul className='-mx-4 flex scroll-px-4 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden px-4 pb-2 -mb-2 sm:mx-0 sm:mb-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:scroll-px-0 sm:px-0 sm:pb-0 lg:grid-cols-4'>
            {HOME_SERVICES.map((service, index) => {
              const Icon = SERVICE_ICON[service]
              const isHovered = hovered === service
              const isOwned = service === 'design' && ownedDesignRemaining !== undefined

              return (
                <motion.li
                  key={service}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: revealAmount }}
                  transition={{ duration: 0.65, delay: index * 0.12, ease: revealEase }}
                  onMouseEnter={() => setHovered(service)}
                  onMouseLeave={() => setHovered(null)}
                  id={`home-service-${service}`}
                  className={cn(
                    'bg-card text-card-foreground flex h-full w-[68%] shrink-0 snap-start flex-col gap-2 rounded-2xl border p-4 transition-[transform,box-shadow,border-color] sm:w-auto sm:shrink sm:p-5 duration-500 ease-out motion-reduce:transform-none motion-reduce:transition-none',
                    isHovered && 'border-primary/50 ring-primary/15 -translate-y-1 shadow-md ring-4'
                  )}
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <Icon
                      className={cn(
                        'size-6 shrink-0 transition-colors duration-500 ease-out motion-reduce:transition-none',
                        isHovered ? 'text-brand-orange' : 'text-primary'
                      )}
                      strokeWidth={1.75}
                    />
                    {isOwned ? (
                      <span className='bg-primary/10 text-primary rounded-full px-2 py-1 max-md:text-xs text-[11px] font-semibold whitespace-nowrap'>
                        {t('ownedLabel', { count: ownedDesignRemaining })}
                      </span>
                    ) : null}
                  </div>
                  <h3 className='text-sm leading-snug font-bold'>{t(`items.${service}.title`)}</h3>
                  <p className='text-muted-foreground text-xs leading-relaxed text-pretty'>
                    {t(`items.${service}.description`)}
                  </p>

                  {/* Dòng "Dùng ở bước…" nằm trong khoảng ĐÃ CHỪA SẴN — thẻ
                      không đổi chiều cao khi hiện/ẩn. Dưới `sm` (cảm ứng, không có rê chuột)
                      bỏ hẳn khoảng chừa này để thẻ không trống; đệm thẻ 16px, đệm trên nút 4px. */}
                  <div className='flex min-h-5 items-end max-sm:hidden'>
                    <span
                      className={cn(
                        'text-brand-orange max-md:text-xs text-[11px] font-semibold transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none',
                        isHovered ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                      )}
                    >
                      {t(`items.${service}.usedAtStep`)}
                    </span>
                  </div>

                  {/* Nút chiếm TRỌN bề ngang thẻ, chữ căn giữa (ảnh mockup);
                      rê thẻ thì nút đầy màu thay vì viền. */}
                  <div className='mt-auto pt-3 max-sm:pt-1'>
                    {isOwned ? (
                      <Button
                        asChild
                        className={cn(
                          'h-9 w-full rounded-full text-xs transition-colors',
                          isHovered ? 'brand-orange-button' : 'brand-green-button'
                        )}
                      >
                        {/* Góp ý BuildX: nút đúng với nơi đến — "Xem gói thiết kế" mở Bảng giá. */}
                        <Link href={ROUTES.PLANS}>
                          {t('openPackage')}
                          <ArrowRight className='size-3.5' />
                        </Link>
                      </Button>
                    ) : service === 'supervision' && ownsSupervision ? (
                      <Button
                        asChild
                        className={cn(
                          'h-9 w-full rounded-full text-xs transition-colors',
                          isHovered ? 'brand-orange-button' : 'brand-green-button'
                        )}
                      >
                        <Link href={ROUTES.ACCOUNT}>
                          {t('openSupervision')}
                          <ArrowRight className='size-3.5' />
                        </Link>
                      </Button>
                    ) : service === 'turnkey' ? (
                      <Button
                        className={cn(
                          'h-9 w-full rounded-full text-xs transition-colors',
                          isHovered ? 'brand-orange-button' : 'brand-green-button'
                        )}
                        onClick={() => setTurnkeyOpen(true)}
                      >
                        {t(`items.${service}.action`)}
                        <ArrowRight className='size-3.5' />
                      </Button>
                    ) : (
                      <Button
                        asChild
                        className={cn(
                          'h-9 w-full rounded-full text-xs transition-colors',
                          isHovered ? 'brand-orange-button' : 'brand-green-button'
                        )}
                      >
                        <Link href={SERVICE_HREF[service]}>
                          {t(`items.${service}.action`)}
                          <ArrowRight className='size-3.5' />
                        </Link>
                      </Button>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </div>
      </div>

      <TurnkeyRequestDialog open={turnkeyOpen} onOpenChange={setTurnkeyOpen} />
    </section>
  )
}
