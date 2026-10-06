import { env } from '@/shared/config/env'
import { bmtPlansApi } from './plans.bmt'
import { mockPlansApi } from './plans.mock'

/**
 * `listPlans` = mock + BMT API ghép theo từng field (`plans.bmt.ts`): API có field
 * nào thì hiện field đó, không có thì giữ mock. Gói GIÁM SÁT vẫn đọc kho CMS (API
 * chỉ có tên/giá, thiếu thời hạn / số lượt kiểm tra / quyền lợi cho thẻ giám sát).
 */
const BmtPlansApi = {
  listPlans: bmtPlansApi.listPlans
} satisfies Partial<typeof mockPlansApi>

export const plansApi = env.NEXT_PUBLIC_USE_MOCK_API ? mockPlansApi : { ...mockPlansApi, ...BmtPlansApi }
