'use client'

import { useQuery } from '@tanstack/react-query'

import { adminKeys } from '../../api/admin.keys'
import { getClassificationOptions } from '../../api/bmt/library-sections.api'

/**
 * Lựa chọn phân loại cho form mẫu thư viện: loại công trình, số tầng, tum, phong cách kiến
 * trúc / nội thất của danh mục dự toán hiện hành.
 *
 * Thay cho `useEstimateCatalog` (`/admin/estimate-catalog`, cần quyền `estimate.catalog.manage`):
 * người quản lý thư viện không có quyền sửa danh mục dự toán nhưng vẫn phải chọn được phân loại.
 */
export function useLibraryClassification() {
  return useQuery({
    queryKey: adminKeys.bmt('library', 'classification-options'),
    queryFn: getClassificationOptions
  })
}
