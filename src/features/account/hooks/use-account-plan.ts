'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/shared/auth'

import { accountApi } from '../api/account.api'
import { accountKeys } from '../api/account.keys'

/** Thẻ "GÓI CỦA TÔI" ở trang Tài khoản (mục IX, Hình 17). */
export function useAccountPlan(enabled = true) {
  const { isCustomer } = useAuth()
  return useQuery({
    queryKey: accountKeys.plan(),
    queryFn: () => accountApi.getPlan(),
    enabled: enabled && isCustomer
  })
}
