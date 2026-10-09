import type { Contractor } from '../types/contractor.types'

/**
 * Phần thuần của bảng so sánh nhà thầu (S15), không import gì ngoài kiểu để kiểm bằng `node --test`
 * (xem `scripts/contractor-compare.test.mjs`).
 *
 * Bảng so sánh gửi DANH SÁCH MÃ nhà thầu đã tick lên `GET /contractors/compare` (BR-CTR-008) và nhận lại thông tin từng
 * nhà thầu theo đúng thứ tự, không phụ thuộc nhà thầu có nằm trong danh sách đề xuất hay không. Trường nào nhà thầu chưa
 * khai báo là `null` ở phản hồi và giao diện hiện "Chưa cập nhật".
 */

/** Một nhà thầu trong phản hồi `GET /contractors/compare` (BE `Response.CompareItem`). */
export interface BmtCompareItem {
  contractorId: string
  name: string
  shortDescription?: string | null
  address?: string | null
  provinceCode?: string | null
  regionCode?: string | null
  serviceAreaText?: string | null
  logoUrl?: string | null
  buildingTypes?: { id: string; name: string }[]
  scopes?: { id: string; name: string }[]
  rating?: number | null
  ratingCount?: number | null
  projectCount?: number | null
  /** Chỉ có khi so sánh theo công trình. */
  similarProjectCount?: number | null
  /** Chỉ có khi so sánh theo công trình và nhà thầu có toạ độ. */
  distanceKm?: number | null
  surveyHours?: number | null
  warrantyMonths?: number | null
  acceptingProjects?: boolean | null
  foundedYear?: number | null
  teamSize?: number | null
  legalName?: string | null
  isVerified?: boolean
}

/** Phản hồi `GET /contractors/compare`: nhà thầu theo thứ tự mã gửi lên, và mã không dùng được (không có hoặc đang ẩn). */
export interface BmtCompareResult {
  items: BmtCompareItem[]
  missingIds: string[]
}

const REGIONS = ['north', 'central', 'south'] as const

/**
 * Dòng so sánh của BE → `Contractor` của giao diện. Giá trị chưa khai báo giữ cờ `*Known = false` (hoặc 0 với bảo hành)
 * để {@link compareNumber} trả `null`; không biến thành số 0 như thể nhà thầu đã khai báo.
 */
export function contractorFromCompareItem(item: BmtCompareItem): Contractor {
  const region = REGIONS.find((code) => code === item.regionCode) ?? null
  return {
    id: item.contractorId,
    name: item.name,
    ...(item.logoUrl ? { logoUrl: item.logoUrl } : {}),
    kind: '',
    verified: item.isVerified ?? true,
    ...(item.legalName ? { legalName: item.legalName } : {}),
    rating: item.rating ?? 0,
    reviewCount: item.ratingCount ?? 0,
    ratingKnown: item.rating != null,
    reviewCountKnown: item.ratingCount != null,
    similarProjects: item.similarProjectCount ?? 0,
    similarProjectsKnown: item.similarProjectCount != null,
    completedProjects: item.projectCount ?? 0,
    distanceKm: item.distanceKm ?? 0,
    distanceKnown: item.distanceKm != null,
    serviceAreas: (item.serviceAreaText ?? '')
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter(Boolean),
    region,
    provinceCode: item.provinceCode ?? null,
    surveyWithinHours: item.surveyHours ?? 0,
    surveyTimeKnown: item.surveyHours != null,
    acceptingProjects: item.acceptingProjects ?? false,
    acceptingProjectsKnown: item.acceptingProjects != null,
    intro: '',
    strengths: [],
    photos: [],
    buildingTypeIds: (item.buildingTypes ?? []).map((type) => type.id),
    buildingTypeNames: (item.buildingTypes ?? []).map((type) => type.name),
    scopes: [],
    scopeNames: (item.scopes ?? []).map((scope) => scope.name),
    ...(item.shortDescription ? { shortDescription: item.shortDescription } : {}),
    officeAddress: item.address ?? '',
    foundedYear: item.foundedYear ?? 0,
    teamSize: item.teamSize ?? 0,
    warrantyMonths: item.warrantyMonths ?? 0,
    legalChecks: [],
    featuredProjects: [],
    verifiedProjects: 0,
    partnership: { verified: false, since: '', contractCode: '', signedAt: '', pageCount: 0 },
    hidden: false
  }
}

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
