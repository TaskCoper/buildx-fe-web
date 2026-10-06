import { env } from '@/shared/config/env'
import { bmtGetPlan, bmtGetPurchaseHistory, bmtUpdateProfile } from './account.bmt'
import { mockAccountApi } from './account.mock'

/**
 * Chức năng đã nối BMT API. Hàm nào API chưa đáp ứng đủ giao diện thì KHÔNG
 * khai ở đây — vẫn chạy bản mock kể cả khi tắt `NEXT_PUBLIC_USE_MOCK_API`
 * (danh sách thiếu gửi BE: `docs/BE_API_GAPS.md`).
 *
 * - `updateProfile` → `GET` + `PUT /users/me`.
 * - `getPlan` → `GET /me/design-subscription` (tư vấn 1:1 miễn phí nên bỏ ô lượt
 *   tư vấn; lượt thiết kế có thể lệch với Bước 1 khi Bước 1 còn mock).
 * - `getPurchaseHistory` → `GET /payment-orders` (đơn mua của chính khách). Đơn
 *   thật chỉ có tên gói + giá + trạng thái + ngày; hạng gói cố định, hóa đơn VAT,
 *   hoàn tiền, gói giám sát BE chưa có nên lược bớt (xem `bmtGetPurchaseHistory`).
 */
const BmtAccountApi = {
  // Hồ sơ là bản ghi phiên đăng nhập: khi auth còn giả (`NEXT_PUBLIC_USE_MOCK_AUTH`)
  // thì không có cookie BMT nào để gọi `/users/me`, nên đi theo mock của auth.
  updateProfile: env.NEXT_PUBLIC_USE_MOCK_AUTH ? mockAccountApi.updateProfile : bmtUpdateProfile,
  // Các endpoint `/me/*` và `/payment-orders` cần cookie phiên BMT — auth giả thì
  // không có, nên đi theo mock của auth.
  getPlan: env.NEXT_PUBLIC_USE_MOCK_AUTH ? mockAccountApi.getPlan : bmtGetPlan,
  getPurchaseHistory: env.NEXT_PUBLIC_USE_MOCK_AUTH ? mockAccountApi.getPurchaseHistory : bmtGetPurchaseHistory
} satisfies Partial<typeof mockAccountApi>

export const accountApi = env.NEXT_PUBLIC_USE_MOCK_API ? mockAccountApi : { ...mockAccountApi, ...BmtAccountApi }
