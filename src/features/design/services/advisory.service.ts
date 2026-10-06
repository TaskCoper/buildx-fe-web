import type { CostSection, EstimateResult } from '../types/design.types'
import { costShares, unitCostPerSqm } from './estimate.service'

/**
 * Các biến của đoạn văn tư vấn cá nhân hóa (mục III.3b, khối 3).
 *
 * Văn mẫu nằm ở `messages/*.json` (`design.estimate.advisory.*`) — service này
 * chỉ tính ra con số và chọn nhánh câu, để chuỗi hiển thị vẫn đi qua i18n và
 * phần tính toán vẫn thuần, kiểm thử được. Khi backend trả `result.advisory`
 * (văn bản do AI sinh theo Phụ lục 02, mục II.3) thì dùng thẳng chuỗi đó.
 */
export interface AdvisoryFacts {
  /** Suất đầu tư bình quân trên m² sàn. */
  unitCost: number
  /** Tỷ trọng % của từng phần, đã làm tròn cho tổng đúng 100. */
  percentBySection: Record<CostSection, number>
  /** Phần chiếm tỷ trọng lớn nhất — quyết định câu nhận xét ở đoạn 3. */
  dominantSection: CostSection
}

export function advisoryFacts(result: EstimateResult): AdvisoryFacts {
  const shares = costShares(result.sections)

  const percentBySection = { structure: 0, finishing: 0, interior: 0 } satisfies Record<CostSection, number>
  for (const share of shares) percentBySection[share.section] = share.percent

  const dominantSection = shares.reduce(
    (best, share) => (share.amount > best.amount ? share : best),
    shares[0] ?? { section: 'structure' as CostSection, amount: 0, percent: 0 }
  ).section

  return { unitCost: unitCostPerSqm(result), percentBySection, dominantSection }
}
