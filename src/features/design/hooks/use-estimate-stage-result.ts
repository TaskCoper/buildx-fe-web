'use client'

import { useQuery } from '@tanstack/react-query'

import { designKeys } from '../api/design.keys'
import { estimatePipelineApi } from '../api/estimate-pipeline.api'

/**
 * Kết quả chặng Dự toán gửi khách; chỉ hỏi khi chặng đã thành công (BE trả 409 khi chưa). Chặng đã thành công không
 * chạy lại được (BR-PROJ-010 khoản 4) nên kết quả không đổi, không cần đọc lại.
 */
export function useEstimateStageResult(projectId: string, { enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: designKeys.stageResult(projectId, 'Estimate'),
    queryFn: ({ signal }) => estimatePipelineApi.getEstimateResult(projectId, signal),
    enabled,
    staleTime: Infinity
  })
}
