import { env } from '@/shared/config/env'
import {
  bmtGetPlan,
  bmtGetPurchaseCounts,
  bmtGetPurchaseHistory,
  bmtGetPurchasePage,
  bmtUpdateProfile
} from './account.bmt'
import { mockAccountApi } from './account.mock'

/**
 * Chức năng đã nối BMT API. Hàm nào API chưa đáp ứng đủ giao diện thì KHÔNG
 * khai ở đây — vẫn chạy bản mock kể cả khi tắt `NEXT_PUBLIC_USE_MOCK_API`
 * (danh sách thiếu gửi BE: `docs/BE_API_GAPS.md`).
 *
 * - `updateProfile` → `GET` + `PUT /users/me`.
 * - `getPlan` → `GET /me/design-subscription` (tư vấn 1:1 miễn phí nên bỏ ô lượt
 *   tư vấn; lượt thiết kế có thể lệch với Bước 1 khi Bước 1 còn mock).
 * - `getPurchasePage` / `getPurchaseCounts` → `GET /payment-orders` (từng trang, lọc theo nhóm) và
 *   `GET /payment-orders/counts` (đơn mua của chính khách). Đơn thật chỉ có tên gói + giá + trạng thái + ngày;
 *   hạng gói cố định, hóa đơn VAT, hoàn tiền BE chưa có nên lược bớt (xem `bmtGetPurchasePage`).
 * - `getPurchaseHistory` → phần "gói hiện tại" quanh lịch sử, không tải đơn (xem `bmtGetPurchaseHistory`).
 */
const BmtAccountApi = {
  // Hồ sơ là bản ghi phiên đăng nhập: khi auth còn giả (`NEXT_PUBLIC_USE_MOCK_AUTH`)
  // thì không có cookie BMT nào để gọi `/users/me`, nên đi theo mock của auth.
  updateProfile: env.NEXT_PUBLIC_USE_MOCK_AUTH ? mockAccountApi.updateProfile : bmtUpdateProfile,
  // Các endpoint `/me/*` và `/payment-orders` cần cookie phiên BMT — auth giả thì
  // không có, nên đi theo mock của auth.
  getPlan: env.NEXT_PUBLIC_USE_MOCK_AUTH ? mockAccountApi.getPlan : bmtGetPlan,
  getPurchaseHistory: env.NEXT_PUBLIC_USE_MOCK_AUTH ? mockAccountApi.getPurchaseHistory : bmtGetPurchaseHistory,
  getPurchasePage: env.NEXT_PUBLIC_USE_MOCK_AUTH ? mockAccountApi.getPurchasePage : bmtGetPurchasePage,
  getPurchaseCounts: env.NEXT_PUBLIC_USE_MOCK_AUTH ? mockAccountApi.getPurchaseCounts : bmtGetPurchaseCounts
} satisfies Partial<typeof mockAccountApi>

export const accountApi = env.NEXT_PUBLIC_USE_MOCK_API ? mockAccountApi : { ...mockAccountApi, ...BmtAccountApi }
