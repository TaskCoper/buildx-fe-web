import { setRequestLocale } from 'next-intl/server'

import { PaymentConnectionManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Kết nối thanh toán SePay (STORY-PAY-001/003) — cấu hình tài khoản nhận theo môi trường. */
export default async function AdminPaymentConnectionsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <PaymentConnectionManager />
}
