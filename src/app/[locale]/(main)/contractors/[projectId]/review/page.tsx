import { setRequestLocale } from 'next-intl/server'

import { BriefReview } from '@/features/contractors'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('contractorReview')

interface PageProps {
  params: Promise<{ locale: Locale; projectId: string }>
}

/** S11 — Kiểm tra hồ sơ dự án, Bước 2. */
export default async function ContractorBriefReviewPage({ params }: PageProps) {
  const { locale, projectId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <BriefReview projectId={projectId} />
    </ProtectedRoute>
  )
}
