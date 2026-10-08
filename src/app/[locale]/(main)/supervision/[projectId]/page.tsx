import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { SupervisionView } from './supervision-view'

export const generateMetadata = pageMetadata('supervision')

/**
 * ISR theo yêu cầu: không dựng sẵn trang nào lúc build; trang đầu tiên khách mở được dựng rồi lưu đệm và làm mới nền.
 * Nội dung theo người dùng nằm ở client nên mọi mã trong đường dẫn dùng chung một khung trang.
 */
export function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ locale: Locale; projectId: string }>
}

/**
 * S20–S23 — Bảng điều khiển giám sát.
 *
 * MỘT trang, bốn trạng thái giai đoạn. `?stage=` chọn giai đoạn đang mở nên
 * banner "Đến giai đoạn 4" và thẻ ở cột trái đều là link chia sẻ được. Tham số đọc ở client (`SupervisionView`),
 * không phải `searchParams` của server, để trang vẫn ISR được.
 */
export default async function SupervisionPage({ params }: PageProps) {
  const { locale, projectId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <SupervisionView projectId={projectId} />
    </ProtectedRoute>
  )
}
