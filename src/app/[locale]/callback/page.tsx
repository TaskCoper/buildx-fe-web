import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import { GoogleCallback } from '@/features/auth'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Logo } from '@/shared/components/common'
import { ROUTES } from '@/shared/constants/routes'
import { pageMetadata } from '@/shared/lib/page-metadata'

const titleOf = pageMetadata('googleCallback')

// Trang nhận mã đăng nhập: không lập chỉ mục và không gửi Referer đi nơi khác (fragment mang mã hoàn tất dùng một lần).
export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { ...(await titleOf(props)), robots: { index: false, follow: false }, referrer: 'no-referrer' }
}

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/**
 * Đích mà Google/BE đưa người dùng về sau khi đăng nhập (`WebReturnUri` = `/callback`). Cố ý đứng ngoài nhóm `(auth)`:
 * nhóm đó dùng `GuestRoute` và sẽ đá khách vừa đăng nhập về trang chủ trước khi kịp quay lại trang đang xem.
 * Không nạp analytics ở đây (khuyến nghị của TDD-AUTH-003).
 */
export default async function GoogleCallbackPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className='bg-muted/30 flex min-h-svh flex-col'>
      <header className='flex h-16 items-center px-4 lg:px-8'>
        <Link href={ROUTES.HOME} aria-label='Home'>
          <Logo />
        </Link>
      </header>
      <main className='flex flex-1 items-center justify-center px-4 py-12'>
        <GoogleCallback />
      </main>
    </div>
  )
}
