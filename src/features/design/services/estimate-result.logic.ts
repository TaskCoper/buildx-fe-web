import type { CostSection, EstimateResult, EstimateSection } from '../types/design.types'

/**
 * Kết quả dự toán THẬT → mô hình màn hình, và trạng thái tác vụ AI. Logic thuần (không React, không HTTP) để kiểm
 * bằng `node --experimental-strip-types`.
 *
 * `dossier.content` theo HỢP ĐỒNG AI nên đọc phòng thủ. Hợp đồng `mock-v1` (TDD-PROJ-002/003) công bố `isSample`,
 * `notice`, `estimate{currency, sections[key, name, amount], total}` và `consultation`; ba phần `rough`, `finishing`,
 * `interior`. Hợp đồng của AI thật có thể khác (chi tiết hơn) — khi đó chỉ cần sửa file này.
 */

/** Trạng thái bản dự toán gom về bốn nhóm giao diện cần. */
export type EstimateStateKind = 'draft' | 'processing' | 'succeeded' | 'failed'

export function estimateStateKind(state: string | null | undefined): EstimateStateKind {
  switch (state) {
    case 'Succeeded':
      return 'succeeded'
    case 'Processing':
    case 'Pending':
      return 'processing'
    case 'Failed':
    case 'TimedOut':
      return 'failed'
    default:
      return 'draft'
  }
}

/** Bước đang dừng suy từ trạng thái AI: chưa gửi → 1, đang xử lý / thất bại → 2, có kết quả → 3. */
export function stepOfState(state: string | null | undefined): 1 | 2 | 3 {
  const kind = estimateStateKind(state)
  return kind === 'succeeded' ? 3 : kind === 'draft' ? 1 : 2
}

/** Lý do thất bại cho khách (khoá dịch `design.estimateApi.failure.<kind>`). */
export type FailureKind = 'timeout' | 'fileUnavailable' | 'invalidResult' | 'generic'

export function failureKind(code: string | null | undefined): FailureKind {
  switch (code) {
    case 'GenerationTimedOut':
    case 'UsageTimedOut':
      return 'timeout'
    case 'ResultFileUnavailable':
      return 'fileUnavailable'
    case 'InvalidProviderResult':
      return 'invalidResult'
    default:
      return 'generic'
  }
}

/** Lỗi luồng chờ kết quả: chưa gửi AI (về Bước 1) hoặc tác vụ thất bại (kèm mã để hiện lý do + Thử lại). */
export class EstimateFlowError extends Error {
  constructor(
    readonly kind: 'notSubmitted' | 'failed',
    readonly failureCode?: string | null
  ) {
    super(kind)
    this.name = 'EstimateFlowError'
  }
}

/* ===========================================================================
 * Ánh xạ nội dung hồ sơ → EstimateResult
 * ======================================================================== */

const COST_ORDER: readonly CostSection[] = ['structure', 'finishing', 'interior']
const SOURCE_KEYS = ['rough', 'finishing', 'interior'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Không thay tiền thiếu/sai bằng 0, hoặc cộng lại tổng thay cho dữ liệu nguồn. */
export function toAmount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('InvalidEstimateResult')
  }
  return value
}

export interface MapContext {
  projectId: string
  /** Diện tích khách nhập (m²) — AI giả không trả diện tích sàn nên dùng số này. */
  areaM2: number
  /** Lúc tác vụ chốt (ISO). */
  completedAt?: string
  /** Đường dẫn tải Excel (route của BE) nếu đã biết. */
  xlsxUrl?: string
}

export interface MappedResult {
  result: EstimateResult
  /** `true` khi AI báo đây là dữ liệu MẪU (hợp đồng `mock-v1`). */
  isSample: boolean
  /** Ghi chú kèm dữ liệu mẫu. */
  notice: string
}

export function mapEstimateContent(content: unknown, context: MapContext): MappedResult {
  if (
    !isRecord(content) ||
    !isRecord(content.estimate) ||
    !Array.isArray(content.estimate.sections) ||
    content.estimate.currency !== 'VND' ||
    typeof content.consultation !== 'string'
  ) {
    throw new Error('InvalidEstimateResult')
  }
  const estimate = content.estimate
  const rawSections = estimate.sections as unknown[]
  if (rawSections.length !== SOURCE_KEYS.length) throw new Error('InvalidEstimateResult')
  const sections: EstimateSection[] = SOURCE_KEYS.map((key, index) => {
    const matches = rawSections.filter((raw) => isRecord(raw) && raw.key === key)
    const raw = matches[0]
    if (matches.length !== 1 || !isRecord(raw) || typeof raw.name !== 'string' || !raw.name.trim()) {
      throw new Error('InvalidEstimateResult')
    }
    const amount = toAmount(raw.amount)
    const section = COST_ORDER[index]!
    return { section, total: amount, items: [{ id: key, label: raw.name, amount, children: [] }] }
  })
  return {
    result: {
      projectId: context.projectId,
      sections,
      grandTotal: toAmount(estimate.total),
      advisory: content.consultation,
      estimatedFloorArea: context.areaM2,
      xlsxUrl: context.xlsxUrl ?? '',
      ...(context.completedAt ? { completedAt: context.completedAt } : {})
    },
    isSample: content.isSample === true,
    notice: typeof content.notice === 'string' ? content.notice : ''
  }
}

/** `YYYY-MM-DD` theo giờ Việt Nam, sau `offsetDays` ngày (BE tính hạn link chia sẻ theo lịch Asia/Ho_Chi_Minh). */
export function vietnamDate(offsetDays = 0): string {
  const target = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(target)
}
