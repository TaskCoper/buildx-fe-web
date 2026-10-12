/**
 * Chặng Dự toán của luồng bốn chặng (STORY-PROJ-008, TDD-PROJ-009 mục P) — logic thuần, không React, không HTTP, không
 * import giá trị nên chạy được bằng `node --test` (xem `scripts/estimate-pipeline.test.mjs`).
 *
 * Màn kết quả làm đúng màn dự toán của app demo (`estimateHtml`, `partTableHtml` trong `web/app.js`): đúng ba tab theo
 * thứ tự Phần thô → Hoàn thiện → Nội thất, mỗi tab một bảng năm cột chia theo nhóm, dòng tổng của phần, rồi tổng dự toán.
 */

export type EstimatePart = 'structure' | 'finishing' | 'interior'

export const ESTIMATE_PARTS: readonly EstimatePart[] = ['structure', 'finishing', 'interior']

/**
 * Tên phần BE trả (`Structure`/`Finishing`/`Interior` của hợp đồng `estimate-v1`) → khóa phần. Nhận thêm khóa của app
 * demo (`phan_tho`, `hoan_thien`, `noi_that`) để BE đổi cách ghi cũng không làm mất cả một tab.
 */
export function estimatePartOf(raw: string | null | undefined): EstimatePart | null {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'structure':
    case 'phan_tho':
      return 'structure'
    case 'finishing':
    case 'hoan_thien':
      return 'finishing'
    case 'interior':
    case 'noi_that':
      return 'interior'
    default:
      return null
  }
}

export interface EstimateLineInput {
  name: string
  size?: string | null
  unit?: string | null
  quantity?: number | null
  unitPrice?: number | null
  amount?: number | null
}

export interface EstimateGroupInput {
  name: string
  items: readonly EstimateLineInput[]
}

export interface EstimatePartInput {
  part: string
  total?: number | null
  groups: readonly EstimateGroupInput[]
}

export interface EstimateTotalsInput {
  structure?: number | null
  finishing?: number | null
  interior?: number | null
  grandTotal?: number | null
}

export interface EstimateResultInput {
  totals?: EstimateTotalsInput | null
  parts: readonly EstimatePartInput[]
}

export interface EstimateTab {
  part: EstimatePart
  groups: readonly EstimateGroupInput[]
  /** Tổng của phần. Phần không có (ví dụ căn hộ không có phần thô) thì 0, như app demo in `money(undefined)`. */
  total: number
  /** Không có nhóm nào: bảng hiện dòng "Phần này không có hạng mục nào." như app demo. */
  empty: boolean
}

const finite = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

function sumAmounts(groups: readonly EstimateGroupInput[]): number {
  let sum = 0
  for (const group of groups) for (const item of group.items) if (finite(item.amount)) sum += item.amount
  return sum
}

/**
 * Ba tab luôn đủ và đúng thứ tự, kể cả khi BE bỏ một phần (căn hộ không có phần thô). Tổng của phần lấy theo thứ tự:
 * `totals.<phần>` → `parts[].total` → cộng thành tiền các dòng. BE cộng thành tiền đã làm tròn (`tinh_tong_js`) nên
 * hai số đầu là nguồn chính; số cộng lại chỉ để không hiện trống khi hợp đồng thiếu trường.
 */
export function estimateTabs(result: EstimateResultInput): EstimateTab[] {
  return ESTIMATE_PARTS.map((part) => {
    const source = result.parts.find((candidate) => estimatePartOf(candidate.part) === part)
    const groups = source?.groups ?? []
    const fromTotals = result.totals?.[part]
    const total = finite(fromTotals) ? fromTotals : finite(source?.total) ? source.total : sumAmounts(groups)
    return { part, groups, total, empty: groups.length === 0 }
  })
}

/** Tổng dự toán: `totals.grandTotal`, thiếu thì cộng tổng ba phần. */
export function estimateGrandTotal(result: EstimateResultInput): number {
  const grand = result.totals?.grandTotal
  if (finite(grand)) return grand
  return estimateTabs(result).reduce((sum, tab) => sum + tab.total, 0)
}

/* ===========================================================================
 * Định dạng số theo app demo
 * ======================================================================== */

/** Locale của ứng dụng → locale của `Intl`. Tiếng Việt dùng `vi-VN` như app demo. */
function intlLocale(locale: string): string {
  return locale === 'en' ? 'en-US' : 'vi-VN'
}

/**
 * Số tiền như `money()` của app demo: làm tròn tới đồng, nhóm nghìn theo locale (`34.780.000` ở tiếng Việt). Đơn vị
 * (`đ`) nằm trong câu i18n. Thiếu số thì `null` để màn hình in "—" thay vì "0 đ" gây hiểu nhầm.
 */
export function formatEstimateAmount(value: number | null | undefined, locale: string): string | null {
  if (!finite(value)) return null
  return new Intl.NumberFormat(intlLocale(locale)).format(Math.round(value))
}

/** Khối lượng như `number()` của app demo: tối đa 2 chữ số lẻ (`18,5` ở tiếng Việt). */
export function formatEstimateQuantity(value: number | null | undefined, locale: string): string | null {
  if (!finite(value)) return null
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 }).format(value)
}

/* ===========================================================================
 * Thời gian thi công dự kiến (khối `schedule` của hợp đồng)
 * ======================================================================== */

export type EstimateScheduleKey = EstimatePart | 'total'

export const ESTIMATE_SCHEDULE_KEYS: readonly EstimateScheduleKey[] = ['structure', 'finishing', 'interior', 'total']

/** Các dòng thời gian thi công có nội dung, theo thứ tự thô → hoàn thiện → nội thất → tổng. */
export function estimateScheduleRows(
  schedule: Partial<Record<EstimateScheduleKey, string | null>> | null | undefined
): { key: EstimateScheduleKey; value: string }[] {
  if (!schedule) return []
  return ESTIMATE_SCHEDULE_KEYS.flatMap((key) => {
    const value = schedule[key]?.trim()
    return value ? [{ key, value }] : []
  })
}

/* ===========================================================================
 * Trạng thái lỗi và chạy lại (BR-PROJ-011, TDD-PROJ-009 mục E)
 * ======================================================================== */

/**
 * Mã lỗi lần chạy Dự toán → nhóm câu cho khách (`design.pipeline.estimate.failure.<kind>`). Khách chỉ thấy câu chung,
 * không thấy tên nhà cung cấp hay chi tiết khóa (STORY-PROJ-008/AC-009); chi tiết nằm ở phần Admin.
 */
export type EstimateFailureKind = 'incomplete' | 'blocked' | 'timedOut' | 'serviceDown' | 'generic'

export function estimateFailureKind(code: string | null | undefined): EstimateFailureKind {
  switch (code) {
    case 'AiOutputIncomplete':
      return 'incomplete'
    case 'AiContentBlocked':
      return 'blocked'
    case 'StageTimedOut':
      return 'timedOut'
    case 'AiProviderUnavailable':
    case 'AiOutOfCredit':
    case 'AiOutputTruncated':
      return 'serviceDown'
    default:
      return 'generic'
  }
}

/** Còn chạy lại được không: hết lượt thì báo liên hệ hỗ trợ (BR-PROJ-011 khoản 2). */
export type StageRetryState = { kind: 'limit' } | { kind: 'left'; count: number } | { kind: 'unknown' }

export function stageRetryState(stage: {
  retriesLeft?: number | null
  blockedReason?: string | null
}): StageRetryState {
  if (stage.blockedReason === 'StageRetryLimitReached' || stage.retriesLeft === 0) return { kind: 'limit' }
  if (typeof stage.retriesLeft === 'number' && stage.retriesLeft > 0) return { kind: 'left', count: stage.retriesLeft }
  return { kind: 'unknown' }
}
