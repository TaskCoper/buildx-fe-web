import { setRequestLocale } from 'next-intl/server'

import { OrderManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Đơn hàng & đối soát chuyển khoản QR — vận hành xác nhận tiền đã về (R10). */
export default async function AdminOrdersPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <OrderManager />
}
