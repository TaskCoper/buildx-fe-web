import { setRequestLocale } from 'next-intl/server'

import { ContractorMatches } from '@/features/contractors'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('contractorMatches')

interface PageProps {
  params: Promise<{ locale: Locale; projectId: string }>
}

/** S12 — Nhà thầu được đề xuất. */
export default async function ContractorMatchesPage({ params }: PageProps) {
  const { locale, projectId } = await params
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <ContractorMatches projectId={projectId} />
    </ProtectedRoute>
  )
}
