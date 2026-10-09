import { setRequestLocale } from 'next-intl/server'

import { SurveyScheduler } from '@/features/contractors'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('contractorInvite')

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

/** S16 — Chọn thời gian khảo sát cho một nhà thầu. */
export default async function ContractorInvitePage({ params }: PageProps) {
  const { locale, projectId, contractorId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <SurveyScheduler key={contractorId} projectId={projectId} contractorId={contractorId} />
    </ProtectedRoute>
  )
}
