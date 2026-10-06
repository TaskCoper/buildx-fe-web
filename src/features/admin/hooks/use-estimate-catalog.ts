'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { adminKeys } from '../api/admin.keys'
import { getEstimateCatalog, type AdminCatalog } from '../api/bmt/catalog.api'

/**
 * Gốc key của danh mục dự toán trên BMT API. Bảng loại công trình / phong cách
 * đặt key CON dưới gốc này, nên invalidate gốc là mọi màn dùng danh mục (kể cả
 * form mẫu thư viện) tải lại cùng lúc.
 */
export const ESTIMATE_CATALOG_KEY = adminKeys.bmt('estimate-catalog')

/** Danh mục dự toán hiện hành — một request dùng chung cho mọi màn đang mở. */
export function useEstimateCatalog() {
  return useQuery({ queryKey: ESTIMATE_CATALOG_KEY, queryFn: getEstimateCatalog })
}

/**
 * Đọc danh mục MỚI NHẤT (bỏ qua cache) — dùng trước khi mở form sửa để lấy đúng
 * `catalogVersion` cho khóa lạc quan. Request đang chạy thì dùng chung.
 */
export function useFreshCatalog() {
  const queryClient = useQueryClient()
  const fetchFresh = useCallback(
    (): Promise<AdminCatalog> =>
      queryClient.fetchQuery({ queryKey: ESTIMATE_CATALOG_KEY, queryFn: getEstimateCatalog, staleTime: 0 }),
    [queryClient]
  )
  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: ESTIMATE_CATALOG_KEY }), [queryClient])
  return { fetchFresh, invalidate }
}
