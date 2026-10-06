'use client'

import { useQuery } from '@tanstack/react-query'

import { designApi } from '../api/design.api'
import { designKeys } from '../api/design.keys'
import { EstimateFlowError } from '../services/estimate-result.logic'

/**
 * Bước 2 — AI phân tích và lập dự toán. The screen shows the waiting state
 * (mục III.3a) while this is pending, then swaps to the result (mục III.3b).
 */
interface UseEstimateOptions {
  /** Read an existing estimate without re-triggering generation/status changes. */
  readOnly?: boolean
  enabled?: boolean
}

export function useEstimate(projectId: string, { readOnly = false, enabled = true }: UseEstimateOptions = {}) {
  return useQuery({
    queryKey: designKeys.estimate(projectId),
    queryFn: ({ signal }) =>
      readOnly ? designApi.getEstimate(projectId, signal) : designApi.generateEstimate(projectId, signal),
    enabled: Boolean(projectId) && enabled,
    // The estimate is expensive to produce; never silently re-run it.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    // Chưa gửi AI / tác vụ thất bại là trạng thái cuối, thử lại cũng vậy — màn hình xử lý riêng.
    retry: (failureCount, error) => !(error instanceof EstimateFlowError) && failureCount < 2
  })
}
