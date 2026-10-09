import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { StepEstimateView } from './step-estimate-view'

export const generateMetadata = pageMetadata('designEstimate')

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
 * Màn hình 6 + 7 — Bước 2: màn hình chờ AI sinh dự toán rồi màn hình kết quả
 * (mục III.3). Cùng một route, chuyển trạng thái tại chỗ.
 */
export default async function DesignEstimatePage({ params }: PageProps) {
  const { locale, projectId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <StepEstimateView projectId={projectId} />
    </ProtectedRoute>
  )
}
