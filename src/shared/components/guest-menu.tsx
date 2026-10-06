'use client'

import { LogIn, UserPlus, UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useAuthDialogStore } from '@/shared/auth'
import { PreferenceSwitches } from '@/shared/components/common/preference-switches'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import { cn } from '@/shared/lib/utils'

/** Mỗi mục trong dropdown hiện LẦN LƯỢT khi mở (mục II.1), khớp `AccountMenu`. */
const ITEM_STAGGER = [
  'delay-0',
  'delay-[110ms]',
  'delay-[220ms]',
  'delay-[330ms]',
  'delay-[440ms]',
  'delay-[550ms]',
  'delay-[660ms]'
] as const

function staggerClass(index: number): string {
  return cn(
    'animate-in fade-in-0 slide-in-from-top-1 fill-mode-both duration-350 motion-reduce:animate-none',
    ITEM_STAGGER[index] ?? ITEM_STAGGER.at(-1)
  )
}

/**
 * Đối trọng của {@link AccountMenu} cho khách chưa đăng nhập (mục II.1).
 *
 * Thanh công cụ phải giữ nguyên hình dạng ở cả hai trạng thái: một nút chính
 * "Tạo dự án mới" và một biểu tượng tài khoản. Vì vậy khách cũng thấy avatar —
 * chỉ khác nội dung dropdown: Đăng nhập / Đăng ký thay cho hồ sơ và Đăng xuất.
 * Ngôn ngữ + giao diện nằm chung một chỗ ở cả hai menu nên không còn nút bánh
 * răng lẻ loi chỉ hiện với khách.
 */
export function GuestMenu({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const t = useTranslations('nav')
  const tLogin = useTranslations('auth.login')
  const tRegister = useTranslations('auth.register')
  const open = useAuthDialogStore((s) => s.open)

  // Mở popup ở tick sau, không mở ngay trong handler của menu item.
  //
  // Cả dropdown lẫn popup đều là lớp "modal" của Radix: khi mở, lớp ghi lại
  // `pointer-events` hiện tại của <body> rồi đặt thành `none`, lúc đóng thì trả
  // lại đúng giá trị đã ghi. Mở popup ngay trong handler nghĩa là popup mount
  // khi dropdown chưa tháo xong, nên nó ghi lại `none` — và tới khi người dùng
  // đăng nhập xong, popup đóng và áp `none` trở lại cho <body>: cả trang không
  // bấm được gì cho tới khi F5. Lùi một tick là dropdown đã tháo và trả
  // `pointer-events` về bình thường trước khi popup ghi lại.
  const openAfterMenuCloses = (mode: 'login' | 'register') => {
    setTimeout(() => open(mode), 0)
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='ring-primary/0 hover:ring-primary/70 rounded-full ring-2 transition-[box-shadow] duration-300'
          aria-label={t('guest')}
        >
          <Avatar className='size-8'>
            <AvatarFallback>
              <UserRound className='size-4' />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-account-menu
        align='end'
        className='w-64 data-[state=closed]:duration-100 data-[state=closed]:slide-out-to-top-1 data-[state=open]:duration-200'
      >
        <DropdownMenuLabel className='flex flex-col'>
          <span className={cn('truncate text-sm font-medium', staggerClass(0))}>{t('guest')}</span>
          <span className={cn('text-muted-foreground text-xs font-normal text-pretty', staggerClass(1))}>
            {t('guestHint')}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => openAfterMenuCloses('login')} className={staggerClass(2)}>
          <LogIn />
          {tLogin('submit')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openAfterMenuCloses('register')} className={staggerClass(3)}>
          <UserPlus />
          {tRegister('submit')}
        </DropdownMenuItem>
        <PreferenceSwitches className={staggerClass(4)} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
