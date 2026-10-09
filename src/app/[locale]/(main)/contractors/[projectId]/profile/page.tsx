import { setRequestLocale } from 'next-intl/server'

import { BriefForm } from '@/features/contractors'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('contractorBrief')

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

/** S10 — Tự tạo hồ sơ dự án, Bước 1 (luồng B, không mua gói). */
export default async function ContractorBriefPage({ params }: PageProps) {
  const { locale, projectId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <BriefForm projectId={projectId} />
    </ProtectedRoute>
  )
}
