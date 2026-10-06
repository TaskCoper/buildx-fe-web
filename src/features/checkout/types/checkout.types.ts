import type {
  CmsOrder,
  CmsOrderBuyer,
  CmsOrderInvoice,
  CmsOrderKind,
  CmsOrderProduct,
  CmsOrderStatus
} from '@/shared/cms'

/**
 * Kiểu dữ liệu của luồng MUA GÓI (S03–S08).
 *
 * R10 chi phối cả file: chỉ còn MỘT hình thức thanh toán là QR chuyển khoản.
 * Không có `paymentMethod`, không có trường thẻ, không có cổng thanh toán — bỏ
 * hẳn thay vì để một enum một phần tử rồi vài tháng nữa có người thêm lại.
 *
 * Bản ghi đơn hàng sống ở `shared/cms` chứ không ở feature này: chỉ có QR nên
 * đội vận hành là bên xác nhận tiền đã về, màn quản trị phải ghi đúng bản ghi mà
 * màn S06 của khách đang đọc. Tên cũ giữ nguyên để mọi nơi trong feature không
 * phải đổi import.
 */

/** Thứ được bán: gói thiết kế (S01) hoặc gói giám sát thi công (S19). */
export type OrderKind = CmsOrderKind

/**
 * Trạng thái đơn hàng — cũng là thứ quyết định màn nào được mở:
 * `awaiting` → S04 (QR), `verifying` → S06, `failed` → S07, `paid` → S08.
 */
export type OrderStatus = CmsOrderStatus

/** Thông tin người mua, sửa được ngay trên màn xác nhận đơn (S03). */
export type OrderBuyer = CmsOrderBuyer

/** Khối "Xuất hóa đơn" (S03). */
export type OrderInvoice = CmsOrderInvoice

/** Bản chụp sản phẩm tại thời điểm đặt. */
export type OrderProduct = CmsOrderProduct

/** Một đơn mua gói. */
export type Order = CmsOrder

/**
 * Khóa offer của BMT API: `Month` / `Year` cho gói thiết kế, `ConstructionSite`
 * cho gói giám sát. Đơn `POST /payment-orders` cần `offerKey` kèm `planId`.
 */
export type OfferKey = 'Month' | 'Year' | 'ConstructionSite'

/** Dữ liệu tạo đơn từ màn xác nhận (S03). */
export interface CreateOrderPayload {
  productId: string
  kind: OrderKind
  projectId?: string
  buyer: OrderBuyer
  invoice: OrderInvoice
  discountCode: string
  /**
   * Chu kỳ / hình thức gói (BMT API). Bỏ trống với gói mock — mock bỏ qua trường
   * này; gói API (planId là UUID) gửi kèm khi tạo đơn.
   */
  offerKey?: OfferKey
}
