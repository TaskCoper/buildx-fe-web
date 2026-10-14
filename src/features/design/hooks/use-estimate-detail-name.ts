'use client'

import { useEstimateDetail } from './use-estimate-detail'

/** Tên và mã của bản dự toán cho tiêu đề màn chặng; chưa tải xong thì `null`. */
export function useEstimateDetailName(projectId: string): { name: string; code: string | null } | null {
  const detail = useEstimateDetail(projectId)
  return detail.data ? { name: detail.data.name, code: detail.data.code ?? null } : null
}
