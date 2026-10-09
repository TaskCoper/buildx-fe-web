import type { Contractor } from '../types/contractor.types'

/**
 * Phần thuần của bảng so sánh nhà thầu (S15), không import gì ngoài kiểu để kiểm bằng `node --test`
 * (xem `scripts/contractor-compare.test.mjs`).
 *
 * Bảng so sánh nhận DANH SÁCH MÃ nhà thầu đã tick và tự lấy thông tin từng nhà thầu theo mã, không dựa vào danh sách đề
 * xuất đang hiện: nhà thầu tick từ hồ sơ riêng, hoặc nằm ngoài bán kính mặc định của danh sách, vẫn phải có cột.
 */

/** Tiêu chí so sánh bằng số; `null` = nhà thầu chưa có dữ liệu cho tiêu chí đó. */
export type CompareNumberCriterion = 'rating' | 'similarProjects' | 'distance' | 'surveyTime' | 'warranty'

/** Tiêu chí càng thấp càng tốt; phần còn lại càng cao càng tốt. */
export const LOWER_IS_BETTER: ReadonlySet<string> = new Set(['distance', 'surveyTime'])

/**
 * Giá trị số của một tiêu chí, hoặc `null` khi nhà thầu chưa cập nhật. API phân biệt "chưa khai báo" với 0 bằng các cờ
 * `*Known` (dữ liệu mock cũ không có cờ nên coi là đã biết); bảo hành thì API chỉ có số tháng, 0 nghĩa là chưa khai báo.
 */
export function compareNumber(criterion: CompareNumberCriterion, contractor: Contractor): number | null {
  switch (criterion) {
    case 'rating':
      return contractor.ratingKnown === false ? null : contractor.rating
    case 'similarProjects':
      return contractor.similarProjectsKnown === false ? null : contractor.similarProjects
    case 'distance':
      return contractor.distanceKnown === false ? null : contractor.distanceKm
    case 'surveyTime':
      return contractor.surveyTimeKnown === false ? null : contractor.surveyWithinHours
    case 'warranty':
      return contractor.warrantyMonths > 0 ? contractor.warrantyMonths : null
  }
}

/** Hồ sơ pháp lý: chỉ hiện "đã xác minh" khi hồ sơ thật sự đã được xác minh, không thì chưa cập nhật. */
export function compareLegalVerified(contractor: Contractor): boolean {
  return contractor.verified
}

/**
 * Ghép thông tin của một nhà thầu từ hai nguồn:
 * - `detail` (`GET /contractors/{id}`): đủ hồ sơ, có bảo hành và giới thiệu, nhưng không biết dự án của khách nên không có
 *   "dự án tương tự" và khoảng cách;
 * - `listed` (danh sách đề xuất cho dự án): có "dự án tương tự", khoảng cách và giờ khảo sát, nhưng thiếu bảo hành.
 * Không có `detail` thì dùng tạm `listed`; không có `listed` thì giữ nguyên `detail` (các tiêu chí theo dự án là chưa cập nhật).
 */
export function mergeForCompare(
  detail: Contractor | undefined,
  listed: Contractor | undefined
): Contractor | undefined {
  if (!detail) return listed
  if (!listed) return detail
  return {
    ...detail,
    similarProjects: listed.similarProjects,
    similarProjectsKnown: listed.similarProjectsKnown,
    distanceKm: listed.distanceKm,
    distanceKnown: listed.distanceKnown,
    surveyWithinHours: listed.surveyWithinHours,
    surveyTimeKnown: listed.surveyTimeKnown
  }
}

/**
 * Nhà thầu có giá trị tốt nhất ở mỗi tiêu chí số. Bỏ qua ô chưa cập nhật, cần ít nhất hai giá trị để so, và hoà thì không
 * đánh dấu ai.
 */
export function betterByCriterion(
  rows: readonly Contractor[],
  criteria: readonly CompareNumberCriterion[]
): Map<string, string> {
  const better = new Map<string, string>()
  for (const criterion of criteria) {
    const known = rows.flatMap((contractor) => {
      const value = compareNumber(criterion, contractor)
      return value === null ? [] : [{ id: contractor.id, value }]
    })
    if (known.length < 2) continue
    const values = known.map((entry) => entry.value)
    const best = LOWER_IS_BETTER.has(criterion) ? Math.min(...values) : Math.max(...values)
    if (values.filter((value) => value === best).length > 1) continue
    const winner = known.find((entry) => entry.value === best)
    if (winner) better.set(criterion, winner.id)
  }
  return better
}
