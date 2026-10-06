'use client'

import { useQuery } from '@tanstack/react-query'

import { estimateInputApi } from '../api/estimate-input.api'
import { designKeys } from '../api/design.keys'
import { isApiEstimateId, matchCriteriaOf, type MatchCriteria } from '../services/estimate-input.logic'

/**
 * Điều kiện tìm mẫu thư viện cho một dự toán thật, lấy từ đầu vào ĐÃ GỬI AI (không phải bản đang nhập dở) và danh mục
 * ghim của nó. Chỉ có giá trị khi AI đã tiếp nhận (không còn Draft) — đúng thời điểm TDD-LIB-001 cho phép tìm.
 * `null` = chưa đủ điều kiện hoặc dự toán mock: không có gì để tìm.
 */
export function useMatchCriteria(projectId: string): MatchCriteria | null {
  const real = isApiEstimateId(projectId)
  const detail = useQuery({
    queryKey: designKeys.estimateDetail(projectId),
    queryFn: () => estimateInputApi.getEstimate(projectId),
    enabled: real,
    staleTime: 60_000
  })
  const accepted = Boolean(detail.data && detail.data.state !== 'Draft')
  const catalog = useQuery({
    queryKey: designKeys.estimateCatalog(projectId),
    queryFn: () => estimateInputApi.getCatalog(projectId),
    enabled: real && accepted,
    staleTime: Infinity
  })

  if (!detail.data || !accepted) return null
  return matchCriteriaOf(detail.data.input, detail.data.catalogRevisionId, catalog.data)
}
