import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import type { ReactNode } from 'react'

import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { GuestRoute } from '@/shared/auth'
import { Logo } from '@/shared/components/common'
import { ROUTES } from '@/shared/constants/routes'

/**
 * Cache khung dùng chung; kiểm tra phiên và dữ liệu xác thực nằm ở client.
 * Sau 60 giây, lượt truy cập tiếp theo kích hoạt làm mới nền.
 */
export const revalidate = 60

/**
 * Centered auth layout. `GuestRoute` keeps authenticated users out of
 * login/register screens.
 *
 * Phải tự gọi `setRequestLocale`: `Link` của next-intl dựng ở server nên hỏi ngôn ngữ của request, mà layout con chạy
 * trước khi trang đặt ngôn ngữ. Thiếu bước này thì next-intl đọc `headers()` và cả nhóm trang thành động (không ISR được).
 */
export default async function AuthLayout({
  children,
  params
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <GuestRoute>
      <div className='bg-muted/30 flex min-h-svh flex-col'>
        <header className='flex h-16 items-center px-4 lg:px-8'>
          <Link href={ROUTES.HOME} aria-label='Home'>
            <Logo />
          </Link>
        </header>
        <main className='flex flex-1 items-center justify-center px-4 py-12'>{children}</main>
      </div>
    </GuestRoute>
  )
}
