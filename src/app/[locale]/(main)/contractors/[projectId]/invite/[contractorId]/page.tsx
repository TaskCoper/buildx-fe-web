import { setRequestLocale } from 'next-intl/server'

import { SurveyScheduler } from '@/features/contractors'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('contractorInvite')

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
