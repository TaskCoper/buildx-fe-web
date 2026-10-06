import { env } from '@/shared/config/env'
import { bmtDesignApi } from './design.bmt'
import { mockDesignApi } from './design.mock'

export interface CreateProjectPayload {
  name: string
  description?: string
  /** Vị trí công trình (WGS84): tùy chọn khi tạo nhanh; nếu có phải gửi cả hai (TDD-PROJ-001). */
  latitude?: number
  longitude?: number
}

/** Mock là chế độ tường minh; lỗi API thật không được chuyển sang dữ liệu mẫu. */
export const designApi = env.NEXT_PUBLIC_USE_MOCK_API ? mockDesignApi : bmtDesignApi
