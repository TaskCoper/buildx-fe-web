'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useCmsCollection } from '@/shared/cms'
import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import { supervisionKeys } from '../api/supervision.keys'
import {
  mergeApiIntoPackages,
  type BmtSupervisionPlanItem,
  type SupervisionPackageView
} from '../api/supervision.merge'

/** Gói giám sát đã công bố trên BMT API. Lỗi hoặc rỗng → `[]`, trang vẫn đủ dữ liệu mock. */
async function fetchPublishedSupervisionPlans(): Promise<BmtSupervisionPlanItem[]> {
  try {
    const page = await http.get<PagedResult<BmtSupervisionPlanItem>>('/plans', {
      params: { kind: 'Supervision', pageSize: 100 }
    })
    return page.items
  } catch {
    return []
  }
}

/**
 * Các gói giám sát của trang S19 và luồng mua: MOCK (kho CMS) làm nền, BMT API ghi đè
 * từng field nó có (xem `supervision.merge.ts`). Kho CMS đọc đồng bộ nên lần vẽ đầu
 * đã đủ thẻ, dữ liệu API đến sau chỉ đổi những field nó có — không nháy trống.
 *
 * `isPending` báo dữ liệu API CHƯA về: màn cần biết gói có phải đến từ API hay không
 * (như màn xác nhận đơn) phải chờ cờ này, nếu không sẽ tưởng gói không tồn tại.
 */
export function useSupervisionPackageList(): { packages: SupervisionPackageView[]; isPending: boolean } {
  const base = useCmsCollection('supervisionPackages')
  const { data, isPending } = useQuery({
    queryKey: supervisionKeys.packages(),
    queryFn: fetchPublishedSupervisionPlans,
    staleTime: 60_000
  })

  const packages = useMemo(() => mergeApiIntoPackages(base, data ?? []), [base, data])
  return { packages, isPending }
}

export function useSupervisionPackages(): SupervisionPackageView[] {
  return useSupervisionPackageList().packages
}
