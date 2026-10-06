import { setRequestLocale } from 'next-intl/server'

import { BriefForm } from '@/features/contractors'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('contractorBrief')

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
