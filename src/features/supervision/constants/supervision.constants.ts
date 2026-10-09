import type { StageKey } from '../types/supervision.types'

/**
 * Hằng số của gói giám sát thi công (S19–S24).
 */

/**
 * 6 GIAI ĐOẠN CỐ ĐỊNH (R5). Đây là danh sách đóng: bảng điều khiển, thẻ dự án,
 * bảng lịch trình và mọi con số "x/6" đều đếm từ đúng mảng này.
 */
export const STAGE_KEYS: readonly StageKey[] = [
  'legal',
  'foundation',
  'structure',
  'mep',
  'finishing',
  'handover'
] as const

export const STAGE_COUNT = STAGE_KEYS.length

/** Số ngày của lịch chuẩn, tính từ lúc kích hoạt gói. */
export const STANDARD_SCHEDULE_DAYS = 137

/** Tệp tải lên mỗi giai đoạn: tối đa 10 MB mỗi tệp (S20). */
export const STAGE_FILE_MAX_BYTES = 10 * 1024 * 1024
export const STAGE_PHOTO_ACCEPT = '.jpg,.jpeg,.png,.heic'
export const STAGE_DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx'

export * from '@/shared/cms/supervision-pricing-defaults'
