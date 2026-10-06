import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import type { PlanView } from '../types/plan.types'
import { mockPlansApi } from './plans.mock'
import { mergeApiIntoPlans, type BmtPublishedPlanItem } from './plans.merge'

/**
 * Trang Bảng giá (gói THIẾT KẾ) = mock + BMT API, ghép theo từng field.
 *
 * Mock là nền đầy đủ của ba gói BASIC / PLUS / PRO; field nào `GET /plans` có trả
 * (tên, giá, ảnh, nhãn nổi bật, quyền lợi bật/tắt, tư vấn, điều kiện quà, hai hạn
 * mức phương án thiết kế / tra cứu thư viện mẫu) thì hiện API, field nào không có
 * thì giữ mock. Luật ghép nằm ở `plans.merge.ts`.
 *
 * Hiện ba gói trên BE còn NotPublished và chưa có offer/hạn mức nên API trả rỗng →
 * trang hiển thị đúng bản mock. Vận hành công bố gói thì các field đó tự đổi theo
 * API, không cần sửa code. API lỗi cũng không làm trống bảng giá: về mock.
 */
async function fetchPublishedDesignPlans(): Promise<BmtPublishedPlanItem[]> {
  try {
    const page = await http.get<PagedResult<BmtPublishedPlanItem>>('/plans', {
      params: { kind: 'Design', pageSize: 100 }
    })
    return page.items
  } catch {
    return []
  }
}

export const bmtPlansApi = {
  listPlans: async (): Promise<PlanView[]> => {
    const [plans, published] = await Promise.all([mockPlansApi.listPlans(), fetchPublishedDesignPlans()])
    return mergeApiIntoPlans(plans, published)
  }
}
