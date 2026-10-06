import type { CmsTransaction, CmsTransactionStatus } from '@/shared/cms'
import type { AuthUser } from '@/shared/auth'
import { AUTH_ENDPOINTS, useAuthStore } from '@/shared/auth'
import { http } from '@/shared/lib/api'
import type { ApiError, PagedResult } from '@/shared/types'
import { normalizePhone } from '@/shared/utils'
import type { AccountPlan, AccountPurchaseHistory, PlanAllowance, UpdateProfilePayload } from '../types/account.types'

/** `GET /users/me` — `Response.GetMeBasic` (chỉ các trường feature này dùng). */
interface BmtMe {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string | null
  phoneNumber?: string | null
}

/** `PUT /users/me` — `Command.UpdateUserProfileCommand`. */
interface BmtUpdateProfileBody {
  firstName: string
  lastName: string
  email: string
  avatar: string | null
  phoneNumber: string | null
}

/** Thứ tự tiếng Việt: họ (lastName) trước tên (firstName) — khớp `features/auth`. */
function displayName(me: Pick<BmtMe, 'firstName' | 'lastName'>): string {
  return [me.lastName, me.firstName].filter(Boolean).join(' ').trim()
}

/**
 * Ô "Họ và tên" là một ô; BMT tách họ/tên và bắt buộc cả hai không rỗng.
 *
 * Tên không đổi → gửi lại đúng họ/tên đang lưu (khách chỉ sửa SĐT thì không
 * được làm xáo trộn cách tách cũ). Tên đổi → chữ cuối là tên, phần trước là họ;
 * chỉ một chữ thì họ = tên, cùng quy ước với form đăng ký của `features/auth`.
 */
function splitName(fullName: string, me: BmtMe): Pick<BmtUpdateProfileBody, 'firstName' | 'lastName'> {
  const name = fullName.trim().replace(/\s+/g, ' ')
  if (name === displayName(me)) return { firstName: me.firstName, lastName: me.lastName }

  const words = name.split(' ')
  const firstName = words.pop() ?? name
  return { firstName, lastName: words.join(' ') || firstName }
}

/**
 * Lưu hộp thoại "Chỉnh sửa" hồ sơ lên `PUT /users/me`.
 *
 * API GHI ĐÈ TOÀN BỘ hồ sơ và bắt buộc `firstName`/`lastName`/`email`, nên đọc
 * `/users/me` trước rồi ghép: email và ảnh đại diện giữ nguyên. PUT không trả
 * hồ sơ, nên đọc lại `/users/me` để lấy đúng bản BE đã lưu.
 */
export async function bmtUpdateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  const current = useAuthStore.getState().user
  if (!current) {
    const error: ApiError = { status: 401, message: 'No active session.' }
    throw error
  }

  const me = await http.get<BmtMe>(AUTH_ENDPOINTS.ME)
  const phone = payload.phone.trim()
  const body: BmtUpdateProfileBody = {
    ...splitName(payload.name, me),
    email: me.email,
    avatar: me.avatar ?? null,
    // Bỏ trống ô = xóa số.
    phoneNumber: phone === '' ? null : normalizePhone(phone)
  }
  await http.put<void>(AUTH_ENDPOINTS.ME, body)

  const saved = await http.get<BmtMe>(AUTH_ENDPOINTS.ME)
  return {
    // Vai trò do `features/auth` suy ra từ `/users/me`; hồ sơ không đổi vai trò.
    ...current,
    id: saved.id,
    email: saved.email,
    name: displayName(saved) || saved.email,
    phone: saved.phoneNumber ?? undefined,
    avatarUrl: saved.avatar ?? undefined
  }
}

/** `GET /me/design-subscription` — `Response.DesignSubscriptionView` (trường feature này dùng). */
interface BmtQuotaBalance {
  code: string
  isUnlimited: boolean
  limit?: number | null
  used: number
  reserved: number
  available?: number | null
}

interface BmtDesignSubscription {
  planName: string
  endsAtUtc: string
  quotas?: BmtQuotaBalance[] | null
}

/**
 * Một quota của kỳ → hạn mức "còn / tổng" của thẻ Gói. Quota không giới hạn
 * hiếm gặp với gói thiết kế và không hợp mô hình "còn/tổng"; hiện map về 0/0 và
 * bỏ qua — gói đang dùng đều đặt số lượt hữu hạn.
 */
function toAllowance(quota: BmtQuotaBalance | undefined): PlanAllowance {
  if (!quota || quota.isUnlimited) return { remaining: 0, total: 0 }
  const total = quota.limit ?? 0
  const remaining = quota.available ?? Math.max(total - quota.used - quota.reserved, 0)
  return { remaining, total }
}

/**
 * Thẻ "GÓI CỦA TÔI" đọc kỳ gói thiết kế đang hiệu lực.
 *
 * BMT trả `null` khi tài khoản chưa mua gói → thẻ tự ẩn. Tư vấn 1:1 nay miễn
 * phí nên bỏ ô lượt tư vấn; hai lượt còn lại lấy từ quota `design.generate` và
 * `catalog.detail`. Lượt thiết kế có thể lệch với Bước 1 tới khi luồng thiết kế
 * nối API (hiện còn mock).
 */
export async function bmtGetPlan(): Promise<AccountPlan | null> {
  const sub = await http.get<BmtDesignSubscription | null>('/me/design-subscription')
  if (!sub) return null
  const quota = (code: string) => sub.quotas?.find((item) => item.code === code)
  return {
    name: sub.planName,
    expiresAt: sub.endsAtUtc,
    design: toAllowance(quota('design.generate')),
    library: toAllowance(quota('catalog.detail'))
  }
}

/** `GET /payment-orders` — `Response.PaymentOrderSummary` (đơn mua của chính khách). */
interface BmtPaymentOrderSummary {
  id: string
  planId: string
  planName: string
  kind: 'Design' | 'Supervision'
  offerKey: 'Month' | 'Year' | 'ConstructionSite'
  state: 'Pending' | 'PartiallyPaid' | 'Paid' | 'Expired' | 'Canceled'
  priceVnd: string
  receivedAmountVnd: string
  createdAtUtc: string
  expiresAtUtc: string
  paidAtUtc: string
}

/** Trạng thái đơn BMT → trạng thái giao dịch của UI (UI chưa có "một phần"/"hết hạn"). */
function toTransactionStatus(state: BmtPaymentOrderSummary['state']): CmsTransactionStatus {
  if (state === 'Paid') return 'paid'
  if (state === 'Pending' || state === 'PartiallyPaid') return 'pending'
  return 'failed' // Expired | Canceled
}

/**
 * Lịch sử mua đọc đơn thật `GET /payment-orders`. Đơn thật chỉ có tên gói + giá +
 * trạng thái + ngày, KHÔNG có hạng gói cố định, hóa đơn VAT, hoàn tiền hay khối
 * gói giám sát của bản mock — nên các phần đó để trống (thẻ gói/khối thiết kế tự
 * ẩn khi `subscription`/`designOrderId` = null; thẻ "GÓI CỦA TÔI" cột trái vẫn
 * đọc `/me/design-subscription`). `tier` chỉ là giá trị đệm để hợp kiểu — UI ưu
 * tiên hiện `planName`.
 */
export async function bmtGetPurchaseHistory(): Promise<AccountPurchaseHistory> {
  const orders: BmtPaymentOrderSummary[] = []
  for (let pageIndex = 1; pageIndex <= 20; pageIndex++) {
    const page = await http.get<PagedResult<BmtPaymentOrderSummary>>('/payment-orders', {
      params: { pageIndex, pageSize: 100 }
    })
    orders.push(...page.items)
    if (!page.hasNextPage) break
  }

  const transactions: CmsTransaction[] = orders.map((order) => ({
    id: order.id,
    customerName: '',
    customerEmail: '',
    tier: order.kind === 'Supervision' ? 'check' : 'basic',
    planName: order.planName,
    amount: Number(order.priceVnd) || 0,
    method: 'bank-qr',
    status: toTransactionStatus(order.state),
    createdAt: order.createdAtUtc
  }))

  return {
    subscription: null,
    designOrderId: null,
    supervisionOrderId: null,
    pendingSupervisionOrderId: null,
    supervisionExpiresAt: null,
    transactions
  }
}
