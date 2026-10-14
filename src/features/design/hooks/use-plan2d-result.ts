'use client'

import { useQuery } from '@tanstack/react-query'

import { designKeys } from '../api/design.keys'
import { estimatePipelineApi } from '../api/estimate-pipeline.api'

/** Kết quả chặng 2D gửi khách; chỉ hỏi khi chặng đã thành công (BE trả 409 khi chưa). */
export function usePlan2dResult(projectId: string, { enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: designKeys.stageResult(projectId, 'Plan2d'),
    queryFn: ({ signal }) => estimatePipelineApi.getPlan2dResult(projectId, signal),
    enabled,
    staleTime: Infinity
  })
}
