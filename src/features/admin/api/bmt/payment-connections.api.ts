import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'
import { normalizeHistoryItem, selectionVersion, type PaymentConnectionHistoryItem } from './payment-connections.logic'

/**
 * KẾT NỐI THANH TOÁN (PaymentConnection — STORY-PAY-001/003, TDD-PAY-001).
 *
 * Cấu hình tài khoản ngân hàng nhận tiền cho cổng SePay, tách hai môi trường
 * Test/Live. Mỗi môi trường chỉ có MỘT connection "đang dùng" (isActive). Không
 * có route xoá hay bỏ chọn. Cần quyền `payment.connection.manage`.
 *
 * `secret` do vận hành đặt trên máy chủ, KHÔNG qua API — `secretConfigured` báo
 * đã đặt chưa. Đổi trường tài khoản của connection đã có đơn/giao dịch → 409
 * `PaymentConnectionAccountLocked`. Chọn đang-dùng chỉ nhận connection đang bật,
 * cùng môi trường, đã có secret (409 `PaymentConnectionNotReady`).
 */
export type PaymentEnvironment = 'Test' | 'Live'

export interface PaymentConnectionDto {
  id: string
  environment: PaymentEnvironment
  gateway: string
  accountNumber: string
  subAccount?: string | null
  qrBankCode: string
  enabled: boolean
  isActive: boolean
  secretConfigured: boolean
  accountLocked: boolean
  webhookPath: string
  secretConfigKeys: string[]
  version: number
  createdAtUtc?: string
}

export interface PaymentConnectionInput {
  environment: PaymentEnvironment
  gateway: string
  accountNumber: string
  subAccount?: string | null
  qrBankCode: string
  enabled: boolean
}

/** PUT sửa — Environment không đổi được, nên body bỏ `environment`. */
export interface PaymentConnectionUpdate {
  expectedVersion: number
  gateway: string
  accountNumber: string
  subAccount?: string | null
  qrBankCode: string
  enabled: boolean
}

const BASE = '/admin/payment-connections'
const idempotent = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })

/** BE trả `ListResult` (mảng nhỏ, không phân trang) → chuẩn hoá về mảng. */
function toList(raw: PaymentConnectionDto[] | { items?: PaymentConnectionDto[] } | null): PaymentConnectionDto[] {
  if (Array.isArray(raw)) return raw
  return raw?.items ?? []
}

export const paymentConnectionsApi = {
  async list(): Promise<PaymentConnectionDto[]> {
    const raw = await http.get<PaymentConnectionDto[] | { items?: PaymentConnectionDto[] }>(BASE)
    return toList(raw)
  },

  get: (id: string) => http.get<PaymentConnectionDto>(`${BASE}/${id}`),

  create: (body: PaymentConnectionInput) => http.post<PaymentConnectionDto>(BASE, body, idempotent()),

  update: (id: string, body: PaymentConnectionUpdate) =>
    http.put<PaymentConnectionDto>(`${BASE}/${id}`, body, idempotent()),

  history: async (id: string, params: { pageIndex: number; pageSize: number }) => {
    const page = await http.get<PagedResult<Record<string, unknown>>>(`${BASE}/${id}/history`, { params })
    return { ...page, items: (page.items ?? []).map(normalizeHistoryItem) }
  },

  /**
   * Đặt connection làm "đang dùng" của môi trường. Tự tra `expectedVersion` của bản ghi
   * lựa chọn (xem `selectionVersion`): `null` cho lần chọn đầu. Gặp 409
   * `PaymentConnectionVersionConflict` nghĩa là có người vừa đổi — để lỗi nổi lên, màn tải
   * lại rồi thử lần nữa.
   */
  async selectActive(environment: PaymentEnvironment, connectionId: string) {
    const inEnvironment = (await paymentConnectionsApi.list()).filter((item) => item.environment === environment)
    const historyByConnection: Record<string, PaymentConnectionHistoryItem[]> = {}
    // Không có connection đang dùng thì chắc chắn là lần chọn đầu, khỏi tốn các lời gọi lịch sử.
    if (inEnvironment.some((item) => item.isActive)) {
      await Promise.all(
        inEnvironment.map(async (item) => {
          historyByConnection[item.id] = (
            await paymentConnectionsApi.history(item.id, { pageIndex: 1, pageSize: 100 })
          ).items
        })
      )
    }
    return http.put<{
      environment: string
      connectionId: string
      previousConnectionId?: string | null
      selectedAtUtc?: string
      version: number
    }>(
      `/admin/payment-environments/${environment}/active-connection`,
      { connectionId, expectedVersion: selectionVersion(inEnvironment, historyByConnection) },
      idempotent()
    )
  }
}
