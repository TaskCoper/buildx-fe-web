'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/shared/auth'

import { accountApi } from '../api/account.api'
import { accountKeys } from '../api/account.keys'
import { PURCHASES_PAGE_SIZE, type PurchaseFilter } from '../types/account.types'

/**
 * Một trang Lịch sử mua của riêng tài khoản đang đăng nhập. Giữ trang cũ trên màn trong lúc tải trang mới (đổi trang
 * hoặc đổi chip lọc) để danh sách không nháy về khung xương.
 */
export function usePurchasePage(filter: PurchaseFilter, pageIndex: number) {
  const { isCustomer } = useAuth()
  return useQuery({
    queryKey: accountKeys.purchasePage(filter, pageIndex),
    queryFn: () => accountApi.getPurchasePage(pageIndex, PURCHASES_PAGE_SIZE, filter),
    enabled: isCustomer,
    placeholderData: keepPreviousData
  })
}

/** Số đơn trên từng chip lọc, tính trên toàn bộ đơn của khách chứ không chỉ trang đang xem. */
export function usePurchaseCounts() {
  const { isCustomer } = useAuth()
  return useQuery({
    queryKey: accountKeys.purchaseCounts(),
    queryFn: () => accountApi.getPurchaseCounts(),
    enabled: isCustomer
  })
}
