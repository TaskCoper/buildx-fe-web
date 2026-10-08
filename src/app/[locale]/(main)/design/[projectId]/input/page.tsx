import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { StepInputView } from './step-input-view'

export const generateMetadata = pageMetadata('designInput')

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

/** Màn hình 5 — Bước 1: Nhập liệu (mục III.2). */
export default async function DesignInputPage({ params }: PageProps) {
  const { locale, projectId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <StepInputView projectId={projectId} />
    </ProtectedRoute>
  )
}
