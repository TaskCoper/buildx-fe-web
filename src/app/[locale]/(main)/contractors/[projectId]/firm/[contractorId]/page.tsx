import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { ContractorFirmView } from './contractor-firm-view'

export const generateMetadata = pageMetadata('contractorFirm')

/**
 * ISR theo yêu cầu: không dựng sẵn trang nào lúc build; trang đầu tiên khách mở được dựng rồi lưu đệm và làm mới nền.
 * Nội dung theo người dùng nằm ở client nên mọi mã trong đường dẫn dùng chung một khung trang.
 */
export function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ locale: Locale; projectId: string; contractorId: string }>
}

/**
 * S13 + S14 — Hồ sơ nhà thầu, 4 tab dùng chung một header. `?tab=` đọc ở client (`ContractorFirmView`), không phải
 * `searchParams` của server, để trang vẫn ISR được.
 */
export default async function ContractorFirmPage({ params }: PageProps) {
  const { locale, projectId, contractorId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <ContractorFirmView projectId={projectId} contractorId={contractorId} />
    </ProtectedRoute>
  )
}
