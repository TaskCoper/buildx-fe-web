'use client'

import { useQuery } from '@tanstack/react-query'

import { designKeys } from '../api/design.keys'
import { estimatePipelineApi } from '../api/estimate-pipeline.api'
import { stagePollInterval } from '../services/pipeline.logic'

/**
 * Trạng thái bốn chặng của bản dự toán (`GET /estimates/{id}/stages`). Hỏi lại mỗi 5 giây khi còn chặng đang chờ
 * hoặc đang chạy, rồi tự dừng; không chạy nền khi tab ẩn. Chưa có SignalR nên đây là cách duy nhất biết chặng xong.
 */
export function useStages(projectId: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: designKeys.stages(projectId),
    queryFn: ({ signal }) => estimatePipelineApi.getStages(projectId, signal),
    enabled,
    refetchInterval: (query) => stagePollInterval(query.state.data),
    refetchIntervalInBackground: false
  })
}
