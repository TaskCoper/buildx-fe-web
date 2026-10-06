import type { SupervisionTier } from '@/shared/cms'
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

/** Ba lựa chọn của trang Gói giám sát (S19) — thứ tự cột trên bảng so sánh. */
export const SUPERVISION_TIERS: readonly SupervisionTier[] = ['self', 'check', 'control'] as const

/** Tệp tải lên mỗi giai đoạn: tối đa 10 MB mỗi tệp (S20). */
export const STAGE_FILE_MAX_BYTES = 10 * 1024 * 1024
export const STAGE_PHOTO_ACCEPT = '.jpg,.jpeg,.png,.heic'
export const STAGE_DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx'

/* ===========================================================================
 * Bảng "So sánh chi tiết 3 lựa chọn" (S19)
 * ======================================================================== */

/** Khóa dưới `supervision.pricing.comparison.values`. */
export type SupervisionValueKey =
  | 'unlimited'
  | 'months'
  | 'onePoint'
  | 'mainMilestones'
  | 'allMilestones'
  | 'perVisit'
  | 'everyVisit'
  | 'full'

/** Khóa dưới `supervision.pricing.comparison.rows`. */
export type SupervisionRowKey =
  | 'dossier'
  | 'dashboard'
  | 'timeline'
  | 'progress'
  | 'photos'
  | 'materials'
  | 'issues'
  | 'extras'
  | 'followUp'
  | 'structureCheck'
  | 'dampCheck'
  | 'waterproofCheck'
  | 'finishingCheck'
  | 'materialCheck'
  | 'reportAfter'
  | 'milestoneHandover'
  | 'defectTracking'
  | 'finalInspection'
  | 'handoverChecklist'
  | 'finalReport'

/** Khóa dưới `supervision.pricing.comparison.groups`. */
export type SupervisionGroupKey = 'platform' | 'engineer' | 'handover'

/** Ô bảng: có / không / một khóa chữ. */
export type SupervisionCell = boolean | SupervisionValueKey

export interface SupervisionComparisonRow {
  key: SupervisionRowKey
  values: Record<SupervisionTier, SupervisionCell>
}

export interface SupervisionComparisonGroup {
  key: SupervisionGroupKey
  rows: SupervisionComparisonRow[]
}

const row = (
  key: SupervisionRowKey,
  self: SupervisionCell,
  check: SupervisionCell,
  control: SupervisionCell
): SupervisionComparisonRow => ({ key, values: { self, check, control } })

/**
 * Nhóm "Quyền lợi chính" không nằm ở đây: số lượt kiểm tra, thời hạn và giá đọc
 * thẳng từ bản ghi gói trong kho nội dung để bảng không lệch với thẻ giá.
 *
 * Cố ý KHÔNG có dòng "checklist theo từng giai đoạn" mà bản demo vẽ: R9 nói hoàn
 * thành giai đoạn là tải ảnh/tài liệu kèm tên, không có checklist bắt buộc.
 */
export const SUPERVISION_COMPARISON: readonly SupervisionComparisonGroup[] = [
  {
    key: 'platform',
    rows: [
      row('dossier', true, true, true),
      row('dashboard', false, true, true),
      row('timeline', false, true, true),
      row('progress', false, true, true),
      row('photos', false, true, true),
      row('materials', false, true, true),
      row('issues', false, true, true),
      row('extras', false, true, true),
      row('followUp', false, true, true)
    ]
  },
  {
    key: 'engineer',
    rows: [
      row('structureCheck', false, 'mainMilestones', 'allMilestones'),
      row('dampCheck', false, 'onePoint', true),
      row('waterproofCheck', false, 'onePoint', true),
      row('finishingCheck', false, 'onePoint', true),
      row('materialCheck', false, 'perVisit', 'everyVisit'),
      row('reportAfter', false, true, true)
    ]
  },
  {
    key: 'handover',
    rows: [
      row('milestoneHandover', false, 'mainMilestones', 'full'),
      row('defectTracking', false, false, true),
      row('finalInspection', false, true, true),
      row('handoverChecklist', false, true, true),
      row('finalReport', false, true, true)
    ]
  }
]

/** Bốn dòng của bảng "Giá trị khách hàng nhận được" (S19). */
export type SupervisionValueRowKey = 'calm' | 'transparent' | 'quality' | 'handover'

export const SUPERVISION_VALUE_ROWS: readonly SupervisionValueRowKey[] = ['calm', 'transparent', 'quality', 'handover']

/** Tám bước của khối "Hành trình khách hàng" (S19). */
export type JourneyStepKey = 'choose' | 'inspect' | 'report' | 'handover'

export const JOURNEY_STEPS: readonly JourneyStepKey[] = ['choose', 'inspect', 'report', 'handover']

/** Bốn dòng bảng "Add-on & phụ phí" (S19). */
export type AddonKey = 'extraVisit' | 'urgent' | 'outOfArea' | 'extend'

export const ADDONS: readonly AddonKey[] = ['extraVisit', 'urgent', 'outOfArea', 'extend']
