'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/auth'

import { contractorsApi } from '../api/contractors.api'
import { contractorKeys } from '../api/contractors.keys'

/**
 * Danh sách hồ sơ dự án kèm số lời mời — hộp thoại "Chọn dự án để tìm nhà thầu".
 *
 * Khác `useBriefs` ở chỗ mỗi dòng mang theo số lời mời đã gửi, nhờ đó hộp thoại
 * hiện đúng trạng thái từng dự án ("Chưa mời" / "Đã mời 2/3" / "Đã mời 3/3") mà
 * không phải gọi thêm một truy vấn cho mỗi dòng.
 */
export function useBriefSummaries(enabled = true) {
  const userId = useAuthStore((state) => state.user?.id)
  return useQuery({
    queryKey: contractorKeys.briefSummaries(userId),
    queryFn: () => contractorsApi.listBriefSummaries(),
    enabled: enabled && Boolean(userId)
  })
}
