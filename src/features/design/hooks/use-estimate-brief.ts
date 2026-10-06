'use client'

import { useQuery } from '@tanstack/react-query'

import { designKeys } from '../api/design.keys'
import { estimateInputApi } from '../api/estimate-input.api'
import { isApiEstimateId } from '../services/estimate-input.logic'

/**
 * Ảnh lô đất và diện tích của một dự toán thật cho thẻ ở "Dự án của tôi": danh sách `GET /estimates` không trả hai thứ
 * này nên đọc `GET /estimates/{id}` (cùng khoá với màn nhập liệu nên không gọi trùng). Dự toán mock thì không có.
 */
export function useEstimateBrief(projectId: string) {
  const query = useQuery({
    queryKey: designKeys.estimateDetail(projectId),
    queryFn: () => estimateInputApi.getEstimate(projectId),
    enabled: isApiEstimateId(projectId),
    staleTime: 60_000
  })
  const area = Number(query.data?.input.areaM2)
  return {
    coverUrl: query.data?.input.inputImageUrl ?? null,
    floorArea: Number.isFinite(area) && area > 0 ? area : null
  }
}
