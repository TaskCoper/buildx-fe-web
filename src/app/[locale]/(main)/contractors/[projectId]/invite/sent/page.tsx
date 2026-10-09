import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { InviteSentView } from './invite-sent-view'

export const generateMetadata = pageMetadata('contractorSent')

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

/** S17 — Đã gửi lời mời & đăng ký khảo sát. `?request=` đọc ở client (`InviteSentView`) để trang vẫn ISR được. */
export default async function ContractorInviteSentPage({ params }: PageProps) {
  const { locale, projectId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <InviteSentView projectId={projectId} />
    </ProtectedRoute>
  )
}
