import { http, isApiError } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import { isApiOrderId } from '../constants/checkout.constants'
import type { CreateOrderPayload, Order } from '../types/checkout.types'
import { mockCheckoutApi } from './checkout.mock'
import { mapOrder, planBenefits, type BmtPaymentOrderDetail, type BmtPlanForBenefits } from './checkout.map'

/**
 * Nối luồng MUA GÓI vào BMT API (TDD-PAY-001) — GIỮ MOCK LÀM NỀN.
 *
 * Checkout chọn nhánh THEO DẠNG ID: gói đến từ API (planId là UUID) đi qua
 * `POST /payment-orders`, gói mock (id không phải UUID) chạy mock. Nhờ vậy demo không
 * bao giờ gãy khi chưa có gói thật.
 *
 * Khác biệt luồng API so với mock (user đã chốt, docs xác nhận):
 * - Không có mã giảm giá, không hóa đơn, không thông tin người mua ở đơn.
 * - Không có nút "Tôi đã chuyển khoản": QR tự đối soát qua webhook SePay, màn QR
 *   poll `getOrder` tới khi `Paid` (→ Hoàn tất) hoặc `Expired`/`Canceled` (→ Thất bại).
 * - Ảnh QR lấy thẳng `qrUrl` của đơn; không có endpoint tạo lại QR riêng.
 * - Chỉ tài khoản KHÁCH mua được (nhân viên, kể cả admin, bị 403 `AccessForbidden`).
 *
 * Ánh xạ DTO nằm ở `checkout.map.ts`.
 */

/** Response của `POST /payment-orders/{id}/cancel` — gọn, không đủ dựng `Order`. */
interface BmtPaymentOrderCanceled {
  orderId: string
  state: BmtPaymentOrderDetail['state']
  version: number
  canceledAtUtc?: string | null
  wasAlreadyApplied: boolean
}

const idempotent = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })

async function readOrder(orderId: string): Promise<BmtPaymentOrderDetail> {
  return http.get<BmtPaymentOrderDetail>(`/payment-orders/${orderId}`)
}

/**
 * Đơn ĐÃ TRẢ: bổ sung những gì `PaymentOrderDetail` không mô tả được — tên gói, loại đơn
 * và các dòng lợi ích — bằng cách tra đúng gói trong danh sách công khai. Màn Hoàn tất cần
 * chúng; thiếu thì thẻ gói trống và đơn giám sát bị coi là gói thiết kế. Tra lỗi hay không
 * thấy (gói đã ngừng bán) thì giữ nguyên đơn, không làm hỏng màn.
 */
async function enrichPaid(order: Order, detail: BmtPaymentOrderDetail): Promise<Order> {
  if (detail.state !== 'Paid' || !detail.planId) return order
  try {
    for (const kind of ['Design', 'Supervision'] as const) {
      const page = await http.get<PagedResult<BmtPlanForBenefits>>('/plans', { params: { kind, pageSize: 100 } })
      const plan = page.items.find((item) => item.planId === detail.planId)
      if (!plan) continue
      return {
        ...order,
        product: {
          ...order.product,
          kind: kind === 'Supervision' ? 'supervision' : 'design',
          name: order.product.name || plan.revision?.name || '',
          benefits: planBenefits({ ...plan, kind }, detail.offerKey)
        }
      }
    }
  } catch {
    // Giữ bản chưa bổ sung.
  }
  return order
}

export const bmtCheckoutApi = {
  createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
    // Gói mock (id không phải UUID) → tạo đơn mock như cũ.
    if (!isApiOrderId(payload.productId)) return mockCheckoutApi.createOrder(payload)

    // Mỗi lần bấm là một khoá mới. Body chỉ có planId + offerKey: BE tự lấy giá, quyền
    // lợi và kết nối nhận tiền — client không được gửi, cũng không gửi được.
    const detail = await http.post<BmtPaymentOrderDetail>(
      '/payment-orders',
      { planId: payload.productId, ...(payload.offerKey ? { offerKey: payload.offerKey } : {}) },
      idempotent()
    )
    return mapOrder(detail)
  },

  getOrder: async (orderId: string): Promise<Order> => {
    if (!isApiOrderId(orderId)) return mockCheckoutApi.getOrder(orderId)
    const detail = await readOrder(orderId)
    return enrichPaid(mapOrder(detail), detail)
  },

  regenerateQr: async (orderId: string): Promise<Order> => {
    // API không có endpoint tạo lại QR: đọc lại đơn để lấy `qrUrl` hiện hành.
    if (!isApiOrderId(orderId)) return mockCheckoutApi.regenerateQr(orderId)
    return mapOrder(await readOrder(orderId))
  },

  cancelOrder: async (orderId: string): Promise<Order> => {
    if (!isApiOrderId(orderId)) return mockCheckoutApi.cancelOrder(orderId)

    // Cần `expectedVersion` (khoá lạc quan) nên phải đọc phiên bản hiện hành trước. Nếu
    // trong lúc đó webhook vừa đổi đơn, BE trả 409 `PaymentOrderVersionConflict` → đọc
    // lại và thử đúng một lần nữa. Đơn đã nhận tiền thì BE từ chối
    // (`PaymentOrderCannotCancel`) — lỗi đó để nổi lên cho người dùng, không thử lại.
    const cancelAt = (version: number) =>
      http.post<BmtPaymentOrderCanceled>(
        `/payment-orders/${orderId}/cancel`,
        { expectedVersion: version },
        idempotent()
      )

    const current = await readOrder(orderId)
    try {
      await cancelAt(current.version)
    } catch (error) {
      if (!isApiError(error) || error.messageCode !== 'PaymentOrderVersionConflict') throw error
      await cancelAt((await readOrder(orderId)).version)
    }
    // `cancel` không trả đủ field dựng `Order` → đọc lại đơn đầy đủ.
    return mapOrder(await readOrder(orderId))
  }
}
