import { setRequestLocale } from 'next-intl/server'

import { CONTRACTOR_TABS, ContractorProfile, type ContractorTab } from '@/features/contractors'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('contractorFirm')

interface PageProps {
  params: Promise<{ locale: Locale; projectId: string; contractorId: string }>
  searchParams: Promise<{ tab?: string }>
}

/** Tab hợp lệ lấy từ `?tab=`; giá trị lạ rơi về Tổng quan thay vì màn trắng. */
function resolveTab(value: string | undefined): ContractorTab {
  return CONTRACTOR_TABS.includes(value as ContractorTab) ? (value as ContractorTab) : 'overview'
}

/** S13 + S14 — Hồ sơ nhà thầu, 4 tab dùng chung một header. */
export default async function ContractorFirmPage({ params, searchParams }: PageProps) {
  const { locale, projectId, contractorId } = await params
  const { tab } = await searchParams
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <ContractorProfile projectId={projectId} contractorId={contractorId} tab={resolveTab(tab)} />
    </ProtectedRoute>
  )
}
