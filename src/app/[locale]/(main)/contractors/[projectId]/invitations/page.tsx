import { setRequestLocale } from 'next-intl/server'

import { InvitationTracker } from '@/features/contractors'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('contractorInvitations')

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

/** S18 — Lời mời báo giá (theo dõi lời mời đã gửi). Khách chỉ xem (R4). */
export default async function ContractorInvitationsPage({ params }: PageProps) {
  const { locale, projectId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <InvitationTracker projectId={projectId} />
    </ProtectedRoute>
  )
}
