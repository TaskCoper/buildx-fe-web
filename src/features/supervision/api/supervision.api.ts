import { env } from '@/shared/config/env'
import { mockSupervisionApi } from './supervision.mock'

/**
 * Chức năng đã nối BMT API. Hàm nào API chưa đáp ứng đủ giao diện thì KHÔNG
 * khai ở đây — vẫn chạy bản mock kể cả khi tắt `NEXT_PUBLIC_USE_MOCK_API`
 * (danh sách thiếu gửi BE: `docs/BE_API_GAPS.md`).
 */
const BmtSupervisionApi = {} satisfies Partial<typeof mockSupervisionApi>

export const supervisionApi = env.NEXT_PUBLIC_USE_MOCK_API
  ? mockSupervisionApi
  : { ...mockSupervisionApi, ...BmtSupervisionApi }
