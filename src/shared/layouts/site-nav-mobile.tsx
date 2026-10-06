'use client'

import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { useAuth } from '@/shared/auth'
import { Button } from '@/shared/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/components/ui/sheet'
import { cn } from '@/shared/lib/utils'
import { SITE_NAV } from './site-nav.config'

/**
 * Menu điều hướng cho màn hình hẹp (mục II.1).
 *
 * Dưới `md` thanh ngang không đủ chỗ cho 3 mục; ẩn chúng đi mà không có lối vào
 * khác đồng nghĩa người dùng điện thoại không tới được Cẩm nang / Hướng dẫn.
 * Chỉ chứa điều hướng — tài khoản nằm ở avatar cạnh bên, hiện ở mọi bề rộng.
 */
export function SiteNavMobile() {
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant='ghost' size='icon' aria-label={t('menu')} className='md:hidden'>
          <Menu className='size-5' />
        </Button>
      </SheetTrigger>

      {/* `gap-0`: `SheetContent` mặc định cách các khối con 16px, nên nút đầu tiên
          bị đẩy xuống thấp hơn hẳn khoảng cách nó cách mép trái. Khoảng cách từ
          mép panel tới CHỮ của mục là 8 (`nav`) + 12 (mục) = 20px cả ngang lẫn
          dọc, và bằng `px-5` của tiêu đề "Menu". */}
      <SheetContent side='right' showCloseButton={false} className='w-[17rem] gap-0 p-0'>
        {/* Cao đúng bằng thanh header của trang (`--public-header-offset`: 64px,
            56px khi header thu gọn; header đang ẩn thì biến = 0 nên chặn dưới 56px)
            để thanh "Menu" khớp thanh header lúc panel trượt ra phủ lên nó. Tiêu
            đề căn giữa dọc: (64 − 1 viền − 24 dòng chữ) / 2 ≈ 20px = `px-5`, tức
            khoảng cách tới mép trên bằng khoảng cách tới mép trái. Nút đóng nằm
            trong cùng hàng để căn giữa theo tiêu đề, không dùng nút mặc định
            `absolute top-4` (lệch khỏi tâm khi thanh cao hơn 48px). */}
        <SheetHeader className='site-nav-mobile-bar h-[max(var(--public-header-offset,64px),56px)] shrink-0 flex-row items-center justify-between gap-0 border-b px-5 py-0 text-left'>
          <SheetTitle className='text-base'>{t('menu')}</SheetTitle>
          <SheetClose className='text-muted-foreground hover:text-foreground -mr-1 rounded-xs p-1 transition-colors focus-visible:ring-2 focus-visible:outline-hidden'>
            <X className='size-4' />
            <span className='sr-only'>{tCommon('close')}</span>
          </SheetClose>
        </SheetHeader>

        <nav className='flex flex-col p-2'>
          {SITE_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                  active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-foreground/[0.06]'
                )}
              >
                {/* Cùng luật đổi nhãn với thanh ngang: khách thấy "Bảng giá". */}
                {t(item.labelKey === 'plans' && !isAuthenticated ? 'plansGuest' : item.labelKey)}
              </Link>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
