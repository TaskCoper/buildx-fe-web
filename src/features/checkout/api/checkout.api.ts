import { env } from '@/shared/config/env'
import { bmtCheckoutApi } from './checkout.bmt'
import type { PendingDesignOrder } from '../types/checkout.types'
import { mockCheckoutApi } from './checkout.mock'

/**
 * Chức năng đã nối BMT API — GIỮ MOCK LÀM NỀN. Mỗi hàm tự chọn nhánh theo dạng
 * ID (UUID → API, còn lại → mock, xem `checkout.bmt.ts`), nên gói mock của trang
 * Bảng giá (DB backend rỗng) vẫn mua được bình thường.
 *
 * Đã nối cho gói API: `createOrder` (`POST /payment-orders {planId, offerKey}`),
 * `getOrder` (`GET /payment-orders/{id}` — màn QR poll trạng thái), `regenerateQr`
 * (đọc lại `qrUrl`), `cancelOrder` (`POST /payment-orders/{id}/cancel`).
 *
 * Giữ mock: `markTransferred` — luồng API tự đối soát bằng QR, không có nút thủ
 * công nên hàm này chỉ dùng cho gói mock.
 *
 * `getPendingDesignOrder` (đơn thiết kế đang chờ, đọc từ `GET /payment-orders`) cho màn xác nhận đơn.
 */
const BmtCheckoutApi = {
  createOrder: bmtCheckoutApi.createOrder,
  getOrder: bmtCheckoutApi.getOrder,
  regenerateQr: bmtCheckoutApi.regenerateQr,
  cancelOrder: bmtCheckoutApi.cancelOrder,
  getPendingDesignOrder: bmtCheckoutApi.getPendingDesignOrder
}

/** Mock không có đơn chờ nào: gói mock mua lại thoải mái. */
const mockPendingDesignOrder = { getPendingDesignOrder: async (): Promise<PendingDesignOrder | null> => null }

export const checkoutApi = env.NEXT_PUBLIC_USE_MOCK_API
  ? { ...mockCheckoutApi, ...mockPendingDesignOrder }
  : { ...mockCheckoutApi, ...mockPendingDesignOrder, ...BmtCheckoutApi }
