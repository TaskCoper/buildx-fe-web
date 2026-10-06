import { levelDisplay, toggleDisplay, type PlanToggleBenefitKey } from '@/shared/cms'

import type { PlanView } from '../types/plan.types'

/**
 * Bảng "So sánh chi tiết 3 gói" (S01).
 *
 * Ô của bảng tính từ QUYỀN LỢI của từng gói do admin cấu hình (epic
 * DesignPackageManagement §5): tắt → gạch ngang, bật không nội dung → dấu tích,
 * bật có nội dung → hiện nội dung, cấp độ (Cơ bản, 2D & 3D…) → khóa dịch. Thẻ
 * gói và bảng so sánh dùng chung một nguồn.
 *
 * Mọi khóa đều khai báo thành union: `useTranslations` trong dự án này là bản
 * CÓ KIỂU, chuỗi bất kỳ sẽ không biên dịch.
 */

/** Khóa dưới `plans.comparison.values` — ô có chữ thay vì tích / gạch. */
export type PlanValueKey =
  | 'layoutBasic'
  | 'layout2d3d'
  | 'layout2d3dPlus'
  | 'estimateRough'
  | 'estimateDetailed'
  | 'estimateOptimized'
  | 'advisoryOnline'
  | 'advisoryPriority'
  | 'advisoryExpert'

/** Khóa dưới `plans.comparison.rows`. */
export type PlanRowKey = PlanToggleBenefitKey | 'layout' | 'interiorEstimate' | 'advisory' | 'gift' | 'giftCondition'

/** Khóa dưới `plans.comparison.groups`. */
export type PlanGroupKey = 'design' | 'compare' | 'support' | 'proOnly'

/** Giá trị một ô: có / không / một khóa chữ / nội dung admin nhập. */
export type PlanCell = boolean | PlanValueKey | { text: string }

export interface PlanComparisonGroup {
  key: PlanGroupKey
  /** Nhóm quà tặng — tô màu nhấn như bản mô tả. */
  highlight?: boolean
  rows: PlanRowKey[]
}

export const PLAN_COMPARISON: readonly PlanComparisonGroup[] = [
  {
    key: 'design',
    rows: [
      'uploadPhoto',
      'siteInfo',
      'buildingType',
      'style',
      'layout',
      'renderImages',
      'structureEstimate',
      'finishingEstimate',
      'interiorEstimate',
      'materialList',
      'boq',
      'exportDossier',
      'contractorPack'
    ]
  },
  {
    key: 'compare',
    rows: ['compareOptions', 'compareCost', 'compareMaterial', 'optimizeBudget', 'costDelta', 'materialAlternatives']
  },
  { key: 'support', rows: ['advisory', 'render3d'] },
  { key: 'proOnly', highlight: true, rows: ['gift', 'giftCondition'] }
]

const LEVEL_KEYS: Record<string, PlanValueKey> = {
  'layout:basic': 'layoutBasic',
  'layout:2d3d': 'layout2d3d',
  'layout:2d3dPlus': 'layout2d3dPlus',
  'interiorEstimate:rough': 'estimateRough',
  'interiorEstimate:detailed': 'estimateDetailed',
  'interiorEstimate:optimized': 'estimateOptimized',
  'advisory:online': 'advisoryOnline',
  'advisory:priority': 'advisoryPriority',
  'advisory:expert': 'advisoryExpert'
}

/**
 * Ô của một gói ở một dòng. `giftText` là chuỗi đã định dạng giá trị quà (dịch
 * sẵn ở component) — dòng quà chỉ có chữ khi gói có quà.
 */
export function planCell(plan: PlanView | undefined, row: PlanRowKey, giftText: string): PlanCell {
  if (!plan) return false
  if (row === 'gift') return plan.gift ? { text: giftText } : false
  if (row === 'giftCondition') return plan.gift?.conditions ? { text: plan.gift.conditions } : false

  const display =
    row === 'layout' || row === 'interiorEstimate' || row === 'advisory'
      ? levelDisplay(plan.benefits[row])
      : toggleDisplay(plan.benefits.toggles[row])

  if (display.kind === 'off') return false
  if (display.kind === 'check') return true
  if (display.kind === 'text') return { text: display.text }
  return LEVEL_KEYS[`${row}:${display.level}`] ?? true
}

/**
 * Bảng "Giá trị khách hàng nhận được" (S01) — bốn dòng, mỗi gói một câu.
 */
export type PlanValueRowKey = 'easy' | 'time' | 'budget' | 'ready'

export const PLAN_VALUE_ROWS: readonly PlanValueRowKey[] = ['easy', 'time', 'budget', 'ready']
