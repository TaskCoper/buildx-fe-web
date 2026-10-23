'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/auth'

import { contractorsApi } from '../api/contractors.api'
import { contractorKeys } from '../api/contractors.keys'
import { DOSSIERS_PAGE_SIZE } from '../constants/contractors.constants'

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

/**
 * Một trang "Hồ sơ của tôi" ở Tài khoản: BE trả từng trang nên không tải hết công trình. Giữ trang cũ trên màn trong
 * lúc tải trang mới để danh sách không nháy về khung xương.
 */
export function useBriefSummariesPage(pageIndex: number, pageSize = DOSSIERS_PAGE_SIZE) {
  const userId = useAuthStore((state) => state.user?.id)
  return useQuery({
    queryKey: contractorKeys.briefSummaryPage(userId, pageSize, pageIndex),
    queryFn: () => contractorsApi.listBriefSummariesPage(pageIndex, pageSize),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData
  })
}
