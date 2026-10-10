import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { SiteFooterWithContent } from '@/shared/layouts/site-footer.server'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { SharedEstimateView } from './shared-estimate-view'

/**
 * Cache khung dùng chung 60 giây; query, token và dữ liệu được xử lý ở client.
 * Sau thời hạn, lượt truy cập tiếp theo kích hoạt làm mới nền.
 */
export const revalidate = 60

export const generateMetadata = pageMetadata('share')

/**
 * ISR theo yêu cầu: không dựng sẵn trang nào lúc build; trang đầu tiên khách mở được dựng rồi lưu đệm và làm mới nền.
 * Nội dung theo người dùng nằm ở client nên mọi mã trong đường dẫn dùng chung một khung trang.
 */
export function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ locale: Locale; shareId: string }>
}

/** Xem hồ sơ dự toán qua link chia sẻ của BE — không cần đăng nhập. Token nằm ở fragment (`#token=…`). */
export default async function SharedEstimatePage({ params }: PageProps) {
  const { locale, shareId } = await params
  setRequestLocale(locale)

  return (
    <div className='flex min-h-svh flex-col'>
      <main className='flex-1'>
        <SharedEstimateView shareId={shareId} />
      </main>
      <SiteFooterWithContent locale={locale} />
    </div>
  )
}
