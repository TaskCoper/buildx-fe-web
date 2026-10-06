import type { PlanCycle, PlanView } from '../types/plan.types'

/**
 * Chu kỳ mua (Tháng / Năm) của gói thiết kế — logic thuần, không đụng React hay mạng.
 *
 * BMT API cho mỗi gói tối đa hai offer, mỗi offer có giá và hạn mức RIÊNG (vd PRO: tháng
 * 3.990.000đ → 20 phương án / 100 lượt, năm 47.880.000đ → 240 / 1200). `plans.merge.ts` giữ
 * chúng ở `plan.cycles`; ở đây dựng bản "nhìn theo chu kỳ" để thẻ, bảng so sánh và nút mua
 * dùng nguyên `price` / `designCredits` / `libraryCredits` như cũ, không phải biết chu kỳ.
 */

/**
 * Bản của gói theo chu kỳ đã chọn.
 *
 * - Gói có dữ liệu API cho chu kỳ đó → ghi đè giá và hạn mức. Hạn mức API không trả
 *   (để trống hoặc "không giới hạn", giao diện chỉ in được một con số) thì giữ số hiện có.
 * - Gói KHÔNG có dữ liệu chu kỳ nào (mock) → chỉ có tháng, là chính nó.
 * - Còn lại (gói API thiếu offer của chu kỳ này, hoặc mock mà chọn Năm) → đánh dấu
 *   `cycleUnavailable`: không bịa giá năm bằng cách nhân 12, giao diện khoá nút mua.
 */
export function planForCycle(plan: PlanView, cycle: PlanCycle): PlanView {
  const offer = plan.cycles?.[cycle]
  if (offer) {
    return {
      ...plan,
      cycle,
      price: offer.price,
      designCredits: offer.designCredits ?? plan.designCredits,
      libraryCredits: offer.libraryCredits ?? plan.libraryCredits
    }
  }
  if (!plan.cycles && cycle === 'Month') return { ...plan, cycle }
  return { ...plan, cycle, cycleUnavailable: true }
}

/** Có gói nào bán theo năm không — không có thì ẩn hẳn công tắc thay vì hiện một lựa chọn cụt. */
export function hasYearOffer(plans: readonly PlanView[]): boolean {
  return plans.some((plan) => plan.cycles?.Year !== undefined)
}

/**
 * Phần trăm tiết kiệm của gói khi mua năm so với 12 tháng lẻ. `null` khi thiếu một trong hai
 * giá hoặc không rẻ hơn (dưới 1%) — không in "tiết kiệm 0%" hay số âm.
 */
export function yearlySavingPercent(plan: PlanView): number | null {
  const month = plan.cycles?.Month?.price
  const year = plan.cycles?.Year?.price
  if (!month || !year) return null
  const percent = Math.round((1 - year / (month * 12)) * 100)
  return percent >= 1 ? percent : null
}

/** Mức tiết kiệm lớn nhất trong các gói, để in một nhãn chung cạnh nút "Năm". */
export function maxYearlySaving(plans: readonly PlanView[]): number | null {
  const all = plans.map(yearlySavingPercent).filter((value): value is number => value !== null)
  return all.length ? Math.max(...all) : null
}
