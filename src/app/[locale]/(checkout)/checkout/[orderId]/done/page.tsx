import { setRequestLocale } from 'next-intl/server'

import { CheckoutDone } from '@/features/checkout'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('checkoutDone')

interface PageProps {
  params: Promise<{ locale: Locale; orderId: string }>
}

/** S08 — Hoàn tất + ba lựa chọn "Bạn muốn bắt đầu như thế nào?" (R7). */
export default async function CheckoutDonePage({ params }: PageProps) {
  const { locale, orderId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <CheckoutDone orderId={orderId} />
    </ProtectedRoute>
  )
}
