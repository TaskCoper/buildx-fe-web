'use client'

import { CONTRACTOR_TABS, ContractorProfile } from '@/features/contractors'
import { useSearchParamState } from '@/shared/hooks'

export function ContractorFirmView({ projectId, contractorId }: { projectId: string; contractorId: string }) {
  // Tab hợp lệ lấy từ `?tab=`; giá trị lạ rơi về Tổng quan thay vì màn trắng. Đổi tab không gọi máy chủ (xem `useSearchParamState`).
  const [tab, setTab] = useSearchParamState('tab', CONTRACTOR_TABS, 'overview')

  return <ContractorProfile projectId={projectId} contractorId={contractorId} tab={tab} onTabChange={setTab} />
}
