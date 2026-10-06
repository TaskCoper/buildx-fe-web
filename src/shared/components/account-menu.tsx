'use client'

import { ArrowRight, LayoutDashboard, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { ROLES, type AuthUser } from '@/shared/auth'
import { PreferenceSwitches } from '@/shared/components/common/preference-switches'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import { ADMIN_ROUTES, ROUTES } from '@/shared/constants/routes'
import { cn } from '@/shared/lib/utils'

/** Two-letter initials for the avatar fallback (first + last word). */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]![0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** "Mở tiếp dự án" — dự án dở gần nhất, tìm và tính route ở lớp app (mục II.2). */
export interface ResumeProjectLink {
  /** Tên dự án — hiện cạnh nhãn, không hiện mã (uuid). */
  name: string
  href: string
}

/** Mỗi mục trong dropdown hiện LẦN LƯỢT khi mở (mục II.1) — `fill-mode-both` giữ
 * mục ẩn đúng cho tới lượt của nó thay vì chớp sáng rồi mới trễ. */
const ITEM_STAGGER = [
  'delay-0',
  'delay-[110ms]',
  'delay-[220ms]',
  'delay-[330ms]',
  'delay-[440ms]',
  'delay-[550ms]',
  'delay-[660ms]',
  'delay-[770ms]',
  'delay-[880ms]',
  'delay-[990ms]',
  'delay-[1100ms]',
  'delay-[1210ms]'
] as const

function staggerClass(index: number): string {
  return cn(
    'animate-in fade-in-0 slide-in-from-top-1 fill-mode-both duration-350 motion-reduce:animate-none',
    ITEM_STAGGER[index] ?? ITEM_STAGGER.at(-1)
  )
}

/**
 * Authenticated account dropdown (avatar trigger). Used in public headers where
 * a logged-in visitor should see their account, not the login CTA. Logout is
 * wired by the app layer (the auth feature owns the flow).
 *
 * `resumeProject`: chấm xanh trên avatar + mục "Mở tiếp dự án" đầu menu khi
 * khách đang có một dự án chưa hoàn tất (mục II.2) — lớp app tìm dự án đó
 * (`features/design`) rồi truyền route xuống, `shared/` không được biết
 * `features/design` tồn tại.
 */
export function AccountMenu({
  user,
  onLogout,
  onOpenChange,
  resumeProject
}: {
  user: Pick<AuthUser, 'name' | 'email' | 'avatarUrl' | 'roles'>
  onLogout?: () => void
  onOpenChange?: (open: boolean) => void
  resumeProject?: ResumeProjectLink | null
}) {
  const t = useTranslations('nav')
  const initials = initialsOf(user.name)
  const isStaff = user.roles.includes(ROLES.STAFF) || user.roles.includes(ROLES.ADMIN)
  // Mục nào hiện ra cũng nhận độ trễ kế tiếp, nên bỏ/thêm mục không để hụt một nhịp.
  let staggerIndex = 0
  const nextStagger = () => staggerClass(staggerIndex++)

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='ring-primary/0 hover:ring-primary/70 relative rounded-full ring-2 transition-[box-shadow] duration-300'
          aria-label={user.name}
        >
          <Avatar className='size-8'>
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className='text-xs'>{initials}</AvatarFallback>
          </Avatar>
          {!isStaff && resumeProject ? (
            <span
              aria-hidden
              className='bg-primary ring-background absolute right-0 bottom-0 size-2.5 rounded-full ring-2'
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-account-menu
        align='end'
        className='w-64 data-[state=closed]:duration-100 data-[state=closed]:slide-out-to-top-1 data-[state=open]:duration-200'
      >
        {!isStaff && resumeProject ? (
          <DropdownMenuItem asChild className={nextStagger()}>
            <Link href={resumeProject.href}>
              <ArrowRight className='text-primary' />
              <span className='flex min-w-0 items-center gap-1 font-medium' title={resumeProject.name}>
                <span className='shrink-0'>{t('resumeProject')}</span>
                <span className='truncate'>{resumeProject.name}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuLabel className='flex flex-col'>
          <span className={cn('truncate text-sm font-medium', nextStagger())}>{user.name}</span>
          <span className={cn('text-muted-foreground truncate text-xs font-normal', nextStagger())}>{user.email}</span>
        </DropdownMenuLabel>
        {!isStaff ? (
          <>
            <DropdownMenuItem asChild className={nextStagger()}>
              <Link href={ROUTES.DESIGN}>
                <LayoutDashboard />
                {t('design')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className={nextStagger()}>
              <Link href={ROUTES.ACCOUNT}>
                <UserRound />
                {t('account')}
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        {/* Lối vào khu quản trị — chỉ hiện với vai trò admin (mục X). */}
        {isStaff ? (
          <DropdownMenuItem asChild className={nextStagger()}>
            <Link href={ADMIN_ROUTES.DASHBOARD}>
              <ShieldCheck />
              {t('admin')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {/* Ngôn ngữ + giao diện là tuỳ chọn cá nhân nên nằm trong menu tài khoản,
            không chiếm chỗ thường trực trên thanh công cụ. */}
        <PreferenceSwitches className={nextStagger()} />
        {/* Menu chỉ có MỘT đường kẻ ngang: tách "Đăng xuất" khỏi phần còn lại. */}
        <DropdownMenuSeparator className={nextStagger()} />
        <DropdownMenuItem onClick={onLogout} className={nextStagger()}>
          <LogOut />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
