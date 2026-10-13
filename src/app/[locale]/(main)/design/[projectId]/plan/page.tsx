import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { StepPlanView } from './step-plan-view'

export const generateMetadata = pageMetadata('designPlan')

/**
 * ISR theo yêu cầu: không dựng sẵn trang nào lúc build; nội dung theo người dùng nằm ở client nên mọi mã trong đường
 * dẫn dùng chung một khung trang.
 */
export function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ locale: Locale; projectId: string }>
}

/** Luồng bốn chặng — chặng Bản vẽ 2D: theo dõi lần chạy và xem kết quả (STORY-PROJ-002, TDD-PROJ-006/007). */
export default async function DesignPlanPage({ params }: PageProps) {
  const { locale, projectId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <StepPlanView projectId={projectId} />
    </ProtectedRoute>
  )
}
