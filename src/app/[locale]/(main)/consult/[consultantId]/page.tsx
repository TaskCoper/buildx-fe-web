import { setRequestLocale } from 'next-intl/server'

import { ConsultantDetail } from '@/features/consultation'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('consultDetail')

/**
 * ISR theo yêu cầu: không dựng sẵn trang nào lúc build; trang đầu tiên khách mở được dựng rồi lưu đệm và làm mới nền.
 * Nội dung theo người dùng nằm ở client nên mọi mã trong đường dẫn dùng chung một khung trang.
 */
export function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ locale: Locale; consultantId: string }>
}

/** Hồ sơ kiến trúc sư + chọn khung giờ tư vấn (mục VIII.2, Hình 15). */
export default async function ConsultantPage({ params }: PageProps) {
  const { locale, consultantId } = await params
  setRequestLocale(locale)

  return <ConsultantDetail consultantId={consultantId} />
}
