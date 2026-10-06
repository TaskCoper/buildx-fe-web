import { setRequestLocale } from 'next-intl/server'

import { VerifyingTransfer } from '@/features/checkout'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('checkoutVerifying')

interface PageProps {
  params: Promise<{ locale: Locale; orderId: string }>
}

/** S06 — Đang xác nhận chuyển khoản. */
export default async function CheckoutVerifyingPage({ params }: PageProps) {
  const { locale, orderId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <VerifyingTransfer orderId={orderId} />
    </ProtectedRoute>
  )
}
