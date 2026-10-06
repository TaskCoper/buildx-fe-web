'use client'

import { Headphones } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { cmsText, useCmsDocument } from '@/shared/cms'
import { HotlineLink, Logo } from '@/shared/components/common'
import { Button } from '@/shared/components/ui/button'
import { siteConfig } from '@/shared/config/site'
import { ROUTES } from '@/shared/constants/routes'

/**
 * Thanh trên cùng RÚT GỌN của luồng thanh toán (Hình S03, S04, S06, S07, S08).
 *
 * Các màn checkout không dùng thanh điều hướng của site: ảnh chỉ vẽ logo bên
 * trái và một dòng "Bạn cần hỗ trợ?" bên phải. Bỏ menu ở đây là có chủ đích —
 * đang giữa luồng trả tiền thì không mời khách bấm đi chỗ khác.
 */
export function CheckoutHeader() {
  const t = useTranslations('checkout')
  const tNav = useTranslations('nav')
  const settings = useCmsDocument('settings')
  const hotline = cmsText(settings.hotline, siteConfig.contact.hotline)

  return (
    <header className='bg-background sticky top-0 z-40 border-b'>
      <div className='mx-auto flex h-18 w-full max-w-[90rem] items-center justify-between gap-6 px-4 lg:px-8'>
        <Link href={ROUTES.HOME} aria-label={t('steps.plan')} className='shrink-0'>
          <Logo tagline={tNav('brandTagline')} />
        </Link>

        {/* Hình S03: "Bạn cần hỗ trợ?" là CHỮ THƯỜNG (không bấm được), nút viền
            "Liên hệ BuildX" đứng ngay sau mới là chỗ bấm gọi hotline. */}
        <div className='flex shrink-0 items-center gap-2 sm:gap-3'>
          <span className='text-muted-foreground flex items-center gap-2 text-sm whitespace-nowrap'>
            <Headphones className='text-primary size-5 shrink-0' />
            <span className='hidden sm:inline'>{t('headerSupport')}</span>
          </span>
          <Button asChild variant='outline' size='sm' className='rounded-full whitespace-nowrap'>
            <HotlineLink hotline={hotline}>{t('headerSupportAction')}</HotlineLink>
          </Button>
        </div>
      </div>
    </header>
  )
}
