'use client'

import { useQuery } from '@tanstack/react-query'

import { designApi } from '../api/design.api'
import { designKeys } from '../api/design.keys'

/**
 * Bản Bước 1 đã lưu trên server (khác bản nháp autosave ở store). Form dựa vào
 * đây để biết loại công trình / phương án Số tầng nào là giá trị CŨ của hồ sơ —
 * được giữ dù admin đã ngừng — và giá trị nào là chọn mới (epic
 * ConstructionTypeManagement §8).
 */
export function useSavedInput(projectId: string) {
  return useQuery({
    queryKey: designKeys.input(projectId),
    queryFn: () => designApi.getInput(projectId)
  })
}
