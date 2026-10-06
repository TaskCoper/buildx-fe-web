import { COST_SECTIONS } from '../constants/design.constants'
import type {
  CostSection,
  EstimateLineItem,
  EstimateResult,
  EstimateSection,
  EstimateSubItem
} from '../types/design.types'

/** Một hạng mục lớn trước khi cộng dồn — `amount` suy ra từ hạng mục con. */
export type DraftLineItem = Omit<EstimateLineItem, 'amount'>
/** Một phần chi phí trước khi cộng dồn. */
export type DraftSection = Omit<EstimateSection, 'items' | 'total'> & { items: DraftLineItem[] }

/** `quantity × unitPrice`, làm tròn về đồng. */
export function subItemAmount(sub: Omit<EstimateSubItem, 'amount'>): number {
  return Math.round(sub.quantity * sub.unitPrice)
}

/**
 * Cộng dồn hạng mục con → hạng mục lớn → tổng phần, để thành tiền hiển thị trên
 * màn hình và thành tiền trong file Excel không bao giờ lệch nhau.
 */
export function rollUpSections(drafts: readonly DraftSection[]): EstimateSection[] {
  return drafts.map((draft) => {
    const items: EstimateLineItem[] = draft.items.map((item) => ({
      ...item,
      amount: item.children.reduce((sum, sub) => sum + sub.amount, 0)
    }))
    return { section: draft.section, items, total: items.reduce((sum, item) => sum + item.amount, 0) }
  })
}

/** One slice of the tỷ trọng donut (mục III.3b, khối 2). */
export interface CostShare {
  section: CostSection
  amount: number
  /** 0–100, rounded so the labels printed on the donut always sum to 100. */
  percent: number
}

export function sectionTotal(section: EstimateSection): number {
  return section.items.reduce((sum, item) => sum + item.amount, 0)
}

export function grandTotal(sections: readonly EstimateSection[]): number {
  return sections.reduce((sum, section) => sum + section.total, 0)
}

/**
 * Tỷ trọng chi phí 3 phần, dùng cho biểu đồ tròn và phần chú thích.
 *
 * Rounds with the largest-remainder method so the percentages printed on the
 * slices add up to exactly 100 — a plain `Math.round` per slice can drift to
 * 99 or 101 and the numbers sit directly on the chart.
 */
export function costShares(sections: readonly EstimateSection[]): CostShare[] {
  const total = grandTotal(sections)
  const ordered = COST_SECTIONS.map((section) => sections.find((s) => s.section === section)).filter(
    (s): s is EstimateSection => Boolean(s)
  )

  if (total <= 0) return ordered.map((s) => ({ section: s.section, amount: s.total, percent: 0 }))

  const exact = ordered.map((s) => ({ section: s.section, amount: s.total, raw: (s.total / total) * 100 }))
  const shares = exact.map((e) => ({ section: e.section, amount: e.amount, percent: Math.floor(e.raw) }))

  let remainder = 100 - shares.reduce((sum, s) => sum + s.percent, 0)
  const byLargestRemainder = [...exact]
    .map((e, index) => ({ index, frac: e.raw - Math.floor(e.raw) }))
    .sort((a, b) => b.frac - a.frac)

  for (const { index } of byLargestRemainder) {
    if (remainder <= 0) break
    const share = shares[index]
    if (share) {
      share.percent += 1
      remainder -= 1
    }
  }

  return shares
}

/** Đơn giá bình quân trên m² sàn — dùng trong đoạn văn tư vấn. */
export function unitCostPerSqm(result: EstimateResult): number {
  if (result.estimatedFloorArea <= 0) return 0
  return Math.round(result.grandTotal / result.estimatedFloorArea)
}
