import type { CmsContractor, CmsContractorMatching, CmsContractorScope } from './cms.types'

/** Hồ sơ dự án đang chọn — thiếu thì chỉ xét các tiêu chí không phụ thuộc hồ sơ. */
export interface MatchingBrief {
  buildingTypeId: string | null
  scope: CmsContractorScope
}

/**
 * Nhà thầu có đủ điều kiện vào danh sách đề xuất theo quy tắc hiện hành không
 * (spec admin #12, BR-075, ContractorManagement §12). Dùng chung cho trang đề
 * xuất và bản xem trước ở màn quản trị để hai phía không lệch nhau.
 */
export function isContractorEligible(
  contractor: CmsContractor,
  rules: CmsContractorMatching,
  today: string,
  brief?: MatchingBrief
): boolean {
  const { criteria } = rules
  if (contractor.hidden) return false
  if (contractor.region === null || !rules.supportedRegions.includes(contractor.region)) return false
  if (criteria.acceptingOnly && !contractor.acceptingProjects) return false
  if (criteria.verifiedOnly && !contractor.verified) return false
  if (criteria.surveyCapableOnly && !(contractor.surveyCapable ?? contractor.surveyWithinHours > 0)) return false
  if (criteria.legalVerifiedOnly) {
    const legal = contractor.legalProfile
    const expired = Boolean(legal?.licenseValidUntil && legal.licenseValidUntil < today)
    if (legal?.registrationStatus !== 'verified' || expired) return false
  }
  if (criteria.minRating > 0 && contractor.reviewCount > 0 && contractor.rating < criteria.minRating) return false
  if (criteria.capabilityMatch && brief) {
    if (brief.buildingTypeId && !(contractor.buildingTypeIds ?? []).includes(brief.buildingTypeId)) return false
    if (!(contractor.scopes ?? []).includes(brief.scope)) return false
  }
  return true
}

/** Hồ sơ thuộc loại công trình không được hỗ trợ thì không có đề xuất nào. */
export function isBriefSupported(rules: CmsContractorMatching, brief?: MatchingBrief): boolean {
  return !brief?.buildingTypeId || rules.buildingTypeIds.includes(brief.buildingTypeId)
}
