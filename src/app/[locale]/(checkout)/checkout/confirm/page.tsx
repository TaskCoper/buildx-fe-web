import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { ConfirmView } from './confirm-view'

export const generateMetadata = pageMetadata('checkoutConfirm')

interface PageProps {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ plan?: string; project?: string; offer?: string }>
}

/**
 * S03 — Xác nhận đơn hàng (bước 2/4).
 *
 * `?plan=` là mã gói được chọn ở S01 hoặc S19; có `?project=` nghĩa là đơn gắn
 * với một dự án, tức là mua gói giám sát (R8). `?offer=` là khóa chu kỳ / hình
 * thức gói (BMT API cần `offerKey` khi tạo đơn); gói mock bỏ qua.
 */
export default async function CheckoutConfirmPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { plan, project, offer } = await searchParams
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <ConfirmView productId={plan ?? ''} kind={project ? 'supervision' : 'design'} projectId={project} offer={offer} />
    </ProtectedRoute>
  )
}
