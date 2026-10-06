/**
 * Logic thuần của màn Kết nối thanh toán (không gọi mạng) — tách khỏi `payment-connections.api.ts`
 * để kiểm được không cần backend.
 */

export interface PaymentConnectionHistoryItem {
  id: string
  /** `Created` | `Updated` | `Selected` (TDD-PAY-001, bảng PaymentConnectionEvent). */
  action: string
  atUtc: string
  actor?: string | null
  /** Giá trị trước/sau của trường đổi, hoặc connection cũ → mới khi chọn (đã rút gọn thành chữ). */
  detail?: string | null
}

/**
 * Lịch sử: docs chỉ nói "ai, lúc nào, làm gì, giá trị trước/sau" mà KHÔNG có ví dụ JSON,
 * và `Detail` là `jsonb` nên có thể là object chứ không phải chuỗi — in thẳng vào JSX sẽ
 * làm sập cả hộp thoại. Đọc phòng thủ: thử vài tên field quen thuộc, còn object thì rút
 * gọn thành "khoá: giá trị".
 */
export function normalizeHistoryItem(raw: Record<string, unknown>): PaymentConnectionHistoryItem {
  const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null)
  const detailRaw = raw.detail ?? raw.details
  const detail =
    typeof detailRaw === 'string'
      ? text(detailRaw)
      : detailRaw && typeof detailRaw === 'object'
        ? Object.entries(detailRaw as Record<string, unknown>)
            .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
            .join(' · ')
        : null

  return {
    id: String(raw.id ?? ''),
    action: text(raw.action) ?? '',
    atUtc: text(raw.atUtc) ?? text(raw.at) ?? text(raw.occurredAtUtc) ?? '',
    actor: text(raw.actorName) ?? text(raw.actorEmail) ?? text(raw.actor) ?? text(raw.actorId),
    detail
  }
}

/**
 * Version của bản ghi LỰA CHỌN môi trường — thứ `expectedVersion` của
 * `PUT /payment-environments/{env}/active-connection` so sánh (KHÔNG phải version của
 * connection). Docs: lần chọn đầu phải gửi `null`; mỗi lần đổi connection thành công tăng
 * 1 và ghi một dòng lịch sử `Selected` (chọn lại đúng connection đang dùng thì không đổi
 * gì, không ghi). Không có API đọc riêng nên đếm các dòng `Selected` của mọi connection
 * trong môi trường đó.
 *
 * Trả `null` khi môi trường chưa từng chọn.
 */
export function selectionVersion(
  connections: readonly { id: string; isActive: boolean }[],
  historyByConnection: Readonly<Record<string, readonly Pick<PaymentConnectionHistoryItem, 'action'>[]>>
): number | null {
  if (!connections.some((connection) => connection.isActive)) return null
  let selected = 0
  for (const connection of connections) {
    selected += (historyByConnection[connection.id] ?? []).filter((event) => event.action === 'Selected').length
  }
  // Đã có connection đang dùng thì bản ghi lựa chọn chắc chắn tồn tại, version tối thiểu là 1.
  return Math.max(selected, 1)
}
