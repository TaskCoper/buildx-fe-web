import { setRequestLocale } from 'next-intl/server'

import { QrPayment } from '@/features/checkout'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('checkoutPayment')

interface PageProps {
  params: Promise<{ locale: Locale; orderId: string }>
}

/** S04 — Thanh toán QR (bước 3/4). Chỉ QR chuyển khoản (R10). */
export default async function CheckoutPaymentPage({ params }: PageProps) {
  const { locale, orderId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <QrPayment orderId={orderId} />
    </ProtectedRoute>
  )
}
