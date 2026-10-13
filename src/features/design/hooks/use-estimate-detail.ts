'use client'

import { useQuery } from '@tanstack/react-query'

import { designKeys } from '../api/design.keys'
import { estimateInputApi } from '../api/estimate-input.api'

/** Bản dự toán thật (`GET /estimates/{id}`), dùng chung cache với biểu mẫu nhập liệu. */
export function useEstimateDetail(projectId: string) {
  return useQuery({
    queryKey: designKeys.estimateDetail(projectId),
    queryFn: ({ signal }) => estimateInputApi.getEstimate(projectId, signal),
    staleTime: Infinity,
    refetchOnWindowFocus: false
  })
}
