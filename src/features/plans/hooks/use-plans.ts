'use client'

import { useQuery } from '@tanstack/react-query'

import { plansApi } from '../api/plans.api'
import { planKeys } from '../api/plans.keys'

/** Danh sách gói đăng ký (mục VII). */
export function usePlans() {
  return useQuery({
    queryKey: planKeys.list(),
    queryFn: () => plansApi.listPlans()
  })
}
