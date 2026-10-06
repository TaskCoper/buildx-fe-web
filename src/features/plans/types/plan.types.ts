import type { PlanCycle, PlanGift, SubscriptionPlan } from '@/shared/cms'

/**
 * Kiểu dữ liệu của trang Gói đăng ký (mục VII).
 *
 * Gói do admin cấu hình nằm ở `shared/cms`; trang công khai đọc một VIEW của
 * gói — quà tặng đã tra từ Danh mục quà tặng — để component không phải tự ghép.
 */
export type { PlanCycle, PlanCycleOffer, PlanTier, SubscriptionPlan } from '@/shared/cms'

/**
 * `cycle` và `cycleUnavailable` do `services/plan-cycle.ts` đặt khi dựng bản nhìn theo chu kỳ:
 * chu kỳ đang xem, và gói này không có offer cho chu kỳ đó (khoá nút mua).
 */
export type PlanView = SubscriptionPlan & { gift?: PlanGift; cycle?: PlanCycle; cycleUnavailable?: boolean }
