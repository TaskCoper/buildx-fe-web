import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { ConfirmView } from './confirm-view'

export const generateMetadata = pageMetadata('checkoutConfirm')

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/**
 * S03 — Xác nhận đơn hàng (bước 2/4).
 *
 * `?plan=` là mã gói được chọn ở S01 hoặc S19; có `?project=` nghĩa là đơn gắn
 * với một dự án, tức là mua gói giám sát (R8). `?offer=` là khóa chu kỳ / hình
 * thức gói (BMT API cần `offerKey` khi tạo đơn); gói mock bỏ qua.
 *
 * Ba tham số đọc ở client (`ConfirmView`), không phải `searchParams` của server, để trang vẫn ISR được.
 */
export default async function CheckoutConfirmPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <ConfirmView />
    </ProtectedRoute>
  )
}
