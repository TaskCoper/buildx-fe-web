import type { CmsDiscountCode, CmsOrder, CmsTransferInfo } from './cms.types'

/**
 * Luật THƯƠNG MẠI dùng chung giữa trang mua gói (S03–S08) và khu quản trị.
 *
 * Hàm thuần, không đụng kho: bên gọi truyền danh sách mã và đơn vào. Nằm ở
 * `shared/cms` vì cả hai phía phải tính ra CÙNG một con số — ô "Mã giảm giá" ở
 * S03 báo giảm bao nhiêu thì đơn tạo ra phải đúng bấy nhiêu, và cột "Đã dùng"
 * ở màn quản trị phải đếm cùng một cách.
 */

/**
 * Tài khoản nhận chuyển khoản. Số MINH HỌA — backend thật trả tài khoản định
 * danh theo từng đơn để đối soát tự động.
 */
export const RECEIVING_ACCOUNT = {
  bankName: 'Vietcombank',
  bankCode: 'VCB',
  accountNumber: '1028 6688 999',
  accountName: 'CÔNG TY CỔ PHẦN BUILDX'
} as const

/** Nội dung chuyển khoản = mã đơn bỏ gạch ngang (`SVC-26001` → `SVC26001`). */
export function transferContentOf(orderId: string): string {
  return orderId.replace(/-/g, '')
}

export function transferInfoFor(orderId: string, amount: number): CmsTransferInfo {
  const content = transferContentOf(orderId)
  return {
    bankName: RECEIVING_ACCOUNT.bankName,
    accountNumber: RECEIVING_ACCOUNT.accountNumber,
    accountName: RECEIVING_ACCOUNT.accountName,
    content,
    // Chuỗi QR mô phỏng: đủ thông tin để quét ra nội dung đúng khi soi bằng mắt,
    // không phải chuẩn VietQR thật.
    qrPayload: `BuildX|${RECEIVING_ACCOUNT.bankCode}|${RECEIVING_ACCOUNT.accountNumber.replace(/\s/g, '')}|${amount}|${content}`
  }
}

export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase()
}

/** Số đơn ĐÃ THANH TOÁN dùng mã này — tổng và theo từng email. */
export function discountUsage(code: string, orders: readonly CmsOrder[], email?: string) {
  const normalized = normalizeDiscountCode(code)
  const paid = orders.filter((order) => order.status === 'paid' && order.discountCode === normalized)
  const needle = email?.trim().toLowerCase()
  return {
    total: paid.length,
    byEmail: needle ? paid.filter((order) => order.buyer.email.trim().toLowerCase() === needle).length : 0
  }
}

/** Vì sao mã không dùng được — trang quản trị hiện đúng lý do, trang khách gộp lại một câu. */
export type DiscountRejection =
  | 'notFound'
  | 'disabled'
  | 'notStarted'
  | 'expired'
  | 'exhausted'
  | 'perAccount'
  | 'product'
  | 'minOrder'

export type DiscountResult =
  | { ok: true; code: string; amount: number; discount: CmsDiscountCode }
  | { ok: false; reason: DiscountRejection }

export interface DiscountContext {
  productId: string
  subtotal: number
  email?: string
  /** `YYYY-MM-DD` — mặc định hôm nay theo giờ máy. */
  today?: string
}

function todayKey(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Số tiền giảm của một mã cho một mức giá — đã áp trần và không vượt quá giá. */
export function discountAmountOf(discount: CmsDiscountCode, subtotal: number): number {
  const raw = discount.type === 'percent' ? Math.round((subtotal * discount.value) / 100) : discount.value
  const capped = discount.type === 'percent' && discount.maxDiscount ? Math.min(raw, discount.maxDiscount) : raw
  return Math.max(0, Math.min(capped, subtotal))
}

/**
 * Kiểm tra một mã cho một đơn sắp tạo. Thứ tự kiểm tra là thứ tự mà người vận
 * hành sẽ hỏi: mã có không → có bật không → trong hạn không → còn lượt không →
 * đúng gói không → đủ giá trị đơn không.
 */
export function evaluateDiscount(
  input: string,
  context: DiscountContext,
  codes: readonly CmsDiscountCode[],
  orders: readonly CmsOrder[]
): DiscountResult {
  const code = normalizeDiscountCode(input)
  const discount = codes.find((item) => normalizeDiscountCode(item.code) === code)
  if (!code || !discount) return { ok: false, reason: 'notFound' }
  if (!discount.enabled) return { ok: false, reason: 'disabled' }

  const today = context.today ?? todayKey()
  if (discount.startsAt && today < discount.startsAt) return { ok: false, reason: 'notStarted' }
  if (discount.endsAt && today > discount.endsAt) return { ok: false, reason: 'expired' }

  const usage = discountUsage(code, orders, context.email)
  if (discount.usageLimit && usage.total >= discount.usageLimit) return { ok: false, reason: 'exhausted' }
  if (discount.perAccountLimit && context.email && usage.byEmail >= discount.perAccountLimit) {
    return { ok: false, reason: 'perAccount' }
  }

  if (discount.productIds.length > 0 && !discount.productIds.includes(context.productId)) {
    return { ok: false, reason: 'product' }
  }
  if (discount.minOrder && context.subtotal < discount.minOrder) return { ok: false, reason: 'minOrder' }

  return { ok: true, code, amount: discountAmountOf(discount, context.subtotal), discount }
}
