/**
 * Phần thuần của màn Khách hàng (không import alias để kiểm bằng `node --test`, xem `scripts/customers-admin.test.mjs`).
 */

/** `UserStatuses` của backend: chỉ hai giá trị. */
export type BmtCustomerStatus = 'Active' | 'Locked'

/** Khoá nhãn `admin.customerStatus.*`: tài khoản bị khoá được gọi là "Đã ban" trên giao diện. */
export type CustomerStatusView = 'active' | 'suspended'

export interface CustomerNameParts {
  firstName?: string | null
  lastName?: string | null
  email: string
}

/**
 * Họ tên đọc như người Việt: `lastName` là họ và tên đệm, `firstName` là tên (chữ cuối) — đúng cách form đăng ký tách
 * ô "Họ tên". Tài khoản chưa có tên (đăng ký bằng Google chưa bổ sung hồ sơ) thì dùng email để dòng không trống.
 */
export function customerDisplayName(customer: CustomerNameParts): string {
  const name = [customer.lastName, customer.firstName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  return name || customer.email
}

export function customerStatusView(status: string): CustomerStatusView {
  return status === 'Locked' ? 'suspended' : 'active'
}

/**
 * Lượt còn lại của một hạn mức hữu hạn = hạn mức − đang giữ − đã dùng, không bao giờ âm (cùng công thức với bản mock cũ,
 * `Còn lại = cấp − giữ − dùng`). Hạn mức không giới hạn thì không có "còn lại".
 */
export function quotaLeft(quota: {
  isUnlimited: boolean
  limit?: number | null
  used: number
  reserved: number
}): number | null {
  if (quota.isUnlimited || quota.limit == null) return null
  return Math.max(0, quota.limit - quota.reserved - quota.used)
}

/**
 * Gói đang dùng của khách trong danh sách "gói đã cấp" (backend sắp lần cấp mới nhất trước): gói thiết kế còn hiệu
 * lực là `Active`; gói giám sát còn giữ chỗ là chưa gán, đã gán hoặc đã hoàn thành. Hết hạn, đã hủy, bị thay thế
 * không tính là đang dùng.
 */
const LIVE_STATES = new Set(['Active', 'Unassigned', 'Assigned', 'Completed'])

export function currentPurchase<T extends { kind: string; effectiveState: string }>(
  purchases: readonly T[],
  kind: 'Design' | 'Supervision'
): T | undefined {
  return purchases.find((item) => item.kind === kind && LIVE_STATES.has(item.effectiveState))
}
