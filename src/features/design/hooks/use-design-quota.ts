'use client'

import { useQuery } from '@tanstack/react-query'

import { designApi } from '../api/design.api'
import { designKeys } from '../api/design.keys'

/**
 * Hạn mức lượt thiết kế còn lại (mục IV.3.c) — hiển thị ngay trên nút
 * "Nhận dự toán ngay" và quyết định trạng thái hết lượt của nút đó.
 */
export function useDesignQuota() {
  return useQuery({
    queryKey: designKeys.quota(),
    queryFn: () => designApi.getQuota()
  })
}
