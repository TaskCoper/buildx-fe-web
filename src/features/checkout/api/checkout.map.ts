import type { Order, OrderStatus } from '../types/checkout.types'

/**
 * Ánh xạ đơn BMT (`PaymentOrderDetail`) → `Order` của màn thanh toán — hàm thuần để
 * kiểm được không cần backend.
 *
 * Swagger không mô tả response, còn TDD-PAY-001 chỉ có MỘT ví dụ (đơn vừa tạo) và
 * nhắc các field khác bằng lời: tên gói, `offerKey`, thông tin thụ hưởng, `qrUrl`,
 * `fulfillment`. Nên mọi field ngoài ví dụ đó đều khai TUỲ CHỌN và đọc phòng thủ: một
 * field BE không trả không được phép làm sập cả màn QR.
 *
 * Tiền là CHUỖI số nguyên VND (để khỏi mất chính xác trên JavaScript) — luôn đổi sang
 * số trước khi dùng.
 */

export interface BmtPaymentBeneficiary {
  gateway?: string
  accountNumber?: string
  bankCode?: string
  transferContent?: string
}

export type BmtOrderState = 'Pending' | 'PartiallyPaid' | 'Paid' | 'Expired' | 'Canceled'

export interface BmtPaymentOrderDetail {
  id: string
  state: BmtOrderState
  priceVnd: string
  currency?: string
  receivedAmountVnd?: string
  eligibleAmountVnd?: string
  remainingAmountVnd?: string
  extraReceivedAmountVnd?: string
  paymentCode?: string
  createdAtUtc: string
  expiresAtUtc: string
  serverNowUtc?: string
  version: number
  // Ngoài ví dụ của TDD — nhắc bằng lời nên có thể thiếu.
  planId?: string
  planName?: string
  offerKey?: 'Month' | 'Year' | 'ConstructionSite'
  kind?: 'Design' | 'Supervision'
  paidAtUtc?: string | null
  qrUrl?: string | null
  beneficiary?: BmtPaymentBeneficiary | null
}

/** Trạng thái đơn BMT → trạng thái màn checkout. */
export function mapState(state: BmtOrderState): OrderStatus {
  switch (state) {
    case 'Pending':
    case 'PartiallyPaid':
      return 'awaiting'
    case 'Paid':
      return 'paid'
    case 'Expired':
    case 'Canceled':
      return 'failed'
  }
}

/** Chuỗi số nguyên VND → số; thiếu hoặc hỏng thì 0 (không ném lỗi làm sập màn). */
export function toNumber(value: string | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * `nowMs` là giờ máy khách lúc nhận đơn, truyền vào để kiểm được. Độ lệch với
 * `serverNowUtc` lưu lại để đếm ngược không sai khi đồng hồ máy khách chạy lệch.
 */
export function mapOrder(detail: BmtPaymentOrderDetail, nowMs: number = Date.now()): Order {
  const price = toNumber(detail.priceVnd)
  const serverNow = detail.serverNowUtc ? Date.parse(detail.serverNowUtc) : Number.NaN
  const beneficiary = detail.beneficiary ?? {}
  const paymentCode = detail.paymentCode ?? ''

  return {
    id: detail.id,
    product: {
      id: detail.planId ?? '',
      kind: detail.kind === 'Supervision' ? 'supervision' : 'design',
      name: detail.planName ?? '',
      price,
      benefits: []
    },
    buyer: { name: '', phone: '', email: '' },
    invoice: { enabled: false, company: '', taxCode: '', address: '', email: '' },
    discountCode: '',
    subtotal: price,
    discountAmount: 0,
    total: price,
    status: mapState(detail.state),
    createdAt: detail.createdAtUtc,
    expiresAt: detail.expiresAtUtc,
    ...(detail.paidAtUtc ? { paidAt: detail.paidAtUtc } : {}),
    transfer: {
      // Tên chủ tài khoản không có trong PaymentConnection nên để trống (trang QR không hiện dòng này). Nội dung
      // chuyển khoản chính là `paymentCode` khi BE không trả riêng.
      bankName: beneficiary.bankCode ?? '',
      accountNumber: beneficiary.accountNumber ?? '',
      accountName: '',
      content: beneficiary.transferContent || paymentCode,
      qrPayload: detail.qrUrl ?? ''
    },
    api: {
      version: detail.version,
      state: detail.state,
      receivedAmount: toNumber(detail.receivedAmountVnd),
      remainingAmount: toNumber(detail.remainingAmountVnd),
      extraReceivedAmount: toNumber(detail.extraReceivedAmountVnd),
      serverOffsetMs: Number.isFinite(serverNow) ? serverNow - nowMs : 0,
      paymentCode,
      ...(detail.offerKey ? { offerKey: detail.offerKey } : {})
    }
  }
}

/* ===========================================================================
 * Lợi ích của gói, dựng từ dữ liệu gói THẬT (`GET /plans`)
 * ======================================================================== */

export interface BmtPlanForBenefits {
  planId?: string
  kind?: 'Design' | 'Supervision'
  revision?: {
    name?: string | null
    description?: string | null
    offers?: { offerKey: string; quotas?: { code: string; isUnlimited: boolean; limit?: number | null }[] }[]
    displayBenefits?: { code: string; enabled: boolean; displayText?: string | null }[]
  }
}

/**
 * Các dòng lợi ích của một gói, chỉ gồm những gì BE thật sự có:
 * - Gói thiết kế: đúng HAI hạn mức (`design.generate`, `catalog.detail`) của offer đã mua,
 *   cộng các quyền bật/tắt đang bật (vd phối cảnh 3D). KHÔNG có "lượt chỉnh sửa" —
 *   BE không có hạn mức đó, đừng suy ra từ số phương án.
 * - Gói giám sát: không có hạn mức, chỉ có mô tả dịch vụ tự do → mỗi dòng mô tả là một
 *   lợi ích (bỏ gạch đầu dòng); dòng không có gạch đầu dòng là câu "phù hợp khi…" nên bỏ.
 */
export function planBenefits(plan: BmtPlanForBenefits, offerKey?: string): string[] {
  const revision = plan.revision
  if (!revision) return []

  if (plan.kind === 'Supervision') {
    return (revision.description ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim())
      .filter(Boolean)
  }

  const offers = revision.offers ?? []
  const offer = offers.find((item) => item.offerKey === (offerKey ?? 'Month')) ?? offers[0]
  const limitOf = (code: string): number | undefined => {
    const quota = offer?.quotas?.find((item) => item.code.toLowerCase() === code)
    return quota && !quota.isUnlimited && typeof quota.limit === 'number' ? quota.limit : undefined
  }

  const lines: string[] = []
  const design = limitOf('design.generate')
  const library = limitOf('catalog.detail')
  if (design !== undefined) lines.push(`${design} phương án thiết kế`)
  if (library !== undefined) lines.push(`${library} lượt tra cứu thư viện mẫu`)
  for (const benefit of revision.displayBenefits ?? []) {
    const text = benefit.displayText?.trim()
    if (benefit.enabled && text) lines.push(text)
  }
  return lines
}
