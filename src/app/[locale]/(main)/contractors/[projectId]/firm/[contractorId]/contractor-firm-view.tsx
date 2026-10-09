'use client'

import { useSearchParams } from 'next/navigation'

import { CONTRACTOR_TABS, ContractorProfile, type ContractorTab } from '@/features/contractors'

/** Tab hợp lệ lấy từ `?tab=`; giá trị lạ rơi về Tổng quan thay vì màn trắng. */
function resolveTab(value: string | null): ContractorTab {
  return CONTRACTOR_TABS.includes(value as ContractorTab) ? (value as ContractorTab) : 'overview'
}

export function ContractorFirmView({ projectId, contractorId }: { projectId: string; contractorId: string }) {
  const tab = resolveTab(useSearchParams().get('tab'))

  return <ContractorProfile projectId={projectId} contractorId={contractorId} tab={tab} />
}
