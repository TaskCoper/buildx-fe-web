'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/shared/auth'

import { accountApi } from '../api/account.api'
import { accountKeys } from '../api/account.keys'

/** Gói hiện tại và sổ giao dịch của riêng tài khoản đang đăng nhập. */
export function usePurchaseHistory(enabled = true) {
  const { isCustomer } = useAuth()
  return useQuery({
    queryKey: accountKeys.purchaseHistory(),
    queryFn: () => accountApi.getPurchaseHistory(),
    enabled: enabled && isCustomer
  })
}
