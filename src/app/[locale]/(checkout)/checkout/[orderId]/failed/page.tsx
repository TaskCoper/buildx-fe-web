import { setRequestLocale } from 'next-intl/server'

import { PaymentFailed } from '@/features/checkout'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('checkoutFailed')

/**
 * ISR theo yêu cầu: không dựng sẵn trang nào lúc build; trang đầu tiên khách mở được dựng rồi lưu đệm và làm mới nền.
 * Nội dung theo người dùng nằm ở client nên mọi mã trong đường dẫn dùng chung một khung trang.
 */
export function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ locale: Locale; orderId: string }>
}

/** S07 — Chưa nhận được thanh toán. */
export default async function CheckoutFailedPage({ params }: PageProps) {
  const { locale, orderId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <PaymentFailed orderId={orderId} />
    </ProtectedRoute>
  )
}
