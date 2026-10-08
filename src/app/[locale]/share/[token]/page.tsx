import { setRequestLocale } from 'next-intl/server'

import { SharedDossierView } from '@/features/design'
import type { Locale } from '@/i18n/routing'
import { SiteFooterWithContent } from '@/shared/layouts/site-footer.server'
import { pageMetadata } from '@/shared/lib/page-metadata'

/**
 * ISR: trang dựng sẵn rồi làm mới nền sau mỗi chừng này giây (khớp chu kỳ lấy nội dung CMS ở server). Backend còn gọi
 * webhook `/api/revalidate` để làm mới ngay khi admin lưu. Phải là số viết thẳng: Next đọc giá trị này lúc build.
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
  params: Promise<{ locale: Locale; token: string }>
}

/** Xem bộ hồ sơ qua link chia sẻ — không cần đăng nhập (mục III.4c). */
export default async function SharePage({ params }: PageProps) {
  const { locale, token } = await params
  setRequestLocale(locale)

  return (
    <div className='flex min-h-svh flex-col'>
      <main className='flex-1'>
        <SharedDossierView token={token} />
      </main>
      <SiteFooterWithContent locale={locale} />
    </div>
  )
}
