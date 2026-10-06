import { cmsDb, cmsSeedOf, resolvePlanGift } from '@/shared/cms'
import { mockDelay } from '@/shared/lib/mock'
import type { PlanView } from '../types/plan.types'

/**
 * Mock của trang Gói đăng ký. Ba gói đọc từ kho `shared/cms` nên admin sửa giá,
 * số lượt, quyền lợi hay quà tặng là bảng giá đổi theo ngay. Gói Ẩn không hiện
 * để mua mới (epic DesignPackageManagement §1).
 */
export const mockPlansApi = {
  listPlans: async (): Promise<PlanView[]> => {
    await mockDelay(150)
    const stored = cmsDb.list('plans')
    // Dữ liệu mock đôi khi còn một bản ghi localStorage rỗng từ lần QA trước.
    // Không để nó làm trang gói trống hoàn toàn: môi trường mock luôn phải có
    // seed BASIC/PLUS/PRO để kiểm thử effect; production không đi qua API này.
    const plans = stored.length ? stored : cmsSeedOf('plans')
    const gifts = cmsDb.list('gifts')
    return plans
      .filter((plan) => plan.status === 'selling')
      .map((plan) => ({ ...plan, gift: resolvePlanGift(plan, gifts) }))
  }
}
