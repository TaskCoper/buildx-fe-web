import type {
  CmsContractor,
  CmsContractorHistoryEntry,
  CmsContractorLegalProfile,
  CmsContractorLocation,
  CmsContractorPartnership,
  CmsContractorProject,
  CmsContractorScope
} from '@/shared/cms'

import { newAdminId } from './admin.service'

/**
 * Quy tắc của epic Quản lý nhà thầu — thuần, không React, không HTTP.
 */

export const CONTRACTOR_SCOPES: readonly CmsContractorScope[] = ['turnkey', 'shell', 'finishing', 'interior']

/** Trạng thái tổng hợp hồ sơ pháp lý (§1, §16) — hệ thống tính, admin không chọn. */
export type LegalStatus = 'none' | 'pending' | 'verified' | 'needsMore'

export type LicenseStatus = NonNullable<CmsContractorLegalProfile['licenseStatus']>

/** Trạng thái kiểm duyệt giấy phép, rơi về cờ cũ `registrationStatus` cho dữ liệu trước đây. */
export function licenseStatusOf(legal: CmsContractorLegalProfile | undefined, today: string): LicenseStatus | null {
  if (!legal || !(legal.registrationNumber || legal.registrationNumberMasked)) return null
  const status: LicenseStatus =
    legal.licenseStatus ?? (legal.registrationStatus === 'verified' ? 'verified' : 'pending')
  // Hết hiệu lực theo ngày thì không còn tính là hợp lệ, dù trước đó đã xác minh.
  if (status === 'verified' && legal.licenseValidUntil && legal.licenseValidUntil < today) return 'expired'
  return status
}

/**
 * Thứ tự ưu tiên (§1): chưa tải giấy tờ → Chưa có hồ sơ; thiếu giấy tờ bắt buộc
 * hoặc giấy tờ bị Từ chối / Hết hiệu lực → Cần bổ sung; đang chờ → Chờ kiểm
 * duyệt; toàn bộ đã xác minh và còn hiệu lực → Đã xác minh.
 */
export function legalStatusOf(contractor: CmsContractor, today: string): LegalStatus {
  const license = licenseStatusOf(contractor.legalProfile, today)
  if (!contractor.legalProfile || license === null) return 'none'
  const legal = contractor.legalProfile
  const entityComplete = Boolean(legal.legalName && (legal.taxCode || legal.taxCodeMasked) && legal.representative)
  if (!entityComplete || license === 'rejected' || license === 'expired') return 'needsMore'
  if (license === 'pending') return 'pending'
  return 'verified'
}

/** Tổng số dự án (kể cả Ẩn) và số dự án đã xác minh — tính từ dữ liệu dự án (§1). */
export function projectCounts(contractor: CmsContractor): { total: number; verified: number } {
  return {
    total: contractor.featuredProjects.length,
    verified: contractor.featuredProjects.filter((project) => project.verified).length
  }
}

export function partnershipStatusOf(
  partnership: CmsContractorPartnership
): NonNullable<CmsContractorPartnership['status']> {
  return partnership.status ?? (partnership.verified ? 'verified' : 'none')
}

/** Tọa độ hợp lệ: vĩ độ −90…90, kinh độ −180…180 (§5). */
export function hasValidCoordinates(location: CmsContractorLocation | undefined): boolean {
  if (!location || location.lat === null || location.lng === null) return false
  return Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180
}

/** Địa chỉ hiển thị ghép từ địa chỉ chi tiết + đơn vị hành chính. */
export function composeLocation(location: CmsContractorLocation | undefined): string {
  if (!location) return ''
  return [location.street.trim(), location.wardName, location.provinceName].filter(Boolean).join(', ')
}

/** Bản che mã số cho giao diện người dùng: giữ 4 ký tự đầu và 1 ký tự cuối. */
export function maskCode(value: string | undefined): string {
  if (!value) return ''
  if (value.length <= 5) return value
  return `${value.slice(0, 4)}${'•'.repeat(Math.max(3, value.length - 5))}${value.slice(-1)}`
}

/** Điều kiện chưa đạt để xác minh hồ sơ nhà thầu (§9). Rỗng = đủ điều kiện. */
export type VerificationGap = 'basicInfo' | 'location' | 'capability' | 'legalEntity' | 'license'

export function verificationGaps(contractor: CmsContractor, today: string): VerificationGap[] {
  const gaps: VerificationGap[] = []
  if (!contractor.name.trim() || !contractor.kind.trim() || !contractor.intro.trim()) gaps.push('basicInfo')
  if (!contractor.headquarters?.provinceCode || !hasValidCoordinates(contractor.headquarters)) gaps.push('location')
  if (!contractor.strengths.length || !contractor.buildingTypeIds?.length || !contractor.scopes?.length) {
    gaps.push('capability')
  }
  const legal = contractor.legalProfile
  if (!legal || !legal.legalName || !(legal.taxCode || legal.taxCodeMasked)) gaps.push('legalEntity')
  // Mã số trên giấy phép phải khớp mã số thuế của pháp nhân (§8).
  else if (legal.registrationNumber && legal.taxCode && legal.registrationNumber !== legal.taxCode) {
    gaps.push('legalEntity')
  }
  if (licenseStatusOf(legal, today) !== 'verified') gaps.push('license')
  return gaps
}

/** Lý do một dự án CHƯA xác minh được — thiếu ảnh thực tế hoặc biên bản nghiệm thu (§7). */
export function projectEvidenceMissing(project: CmsContractorProject): boolean {
  return !project.evidence?.sitePhotoUrls.length || !project.evidence.acceptanceDocUrl
}

/** Thêm một dòng lịch sử (mới nhất lên đầu). */
export function withHistory(
  contractor: CmsContractor,
  entry: Omit<CmsContractorHistoryEntry, 'id' | 'at'>
): CmsContractor {
  const row: CmsContractorHistoryEntry = { id: newAdminId('h'), at: new Date().toISOString(), ...entry }
  return { ...contractor, history: [row, ...(contractor.history ?? [])] }
}

/**
 * Suy ra các trường mà trang công khai đang đọc từ dữ liệu quản trị — gọi mỗi
 * lần lưu để hai phía luôn cùng một nguồn (§12):
 * - địa chỉ văn phòng ghép từ trụ sở chính;
 * - mã số che cho người dùng, trạng thái đăng ký theo kiểm duyệt giấy phép;
 * - nhãn đối tác chỉ bật khi hợp tác VÀ tài liệu đều đã xác minh;
 * - số dự án đã xác minh đếm từ dự án; ẩn dự án là tự bỏ nổi bật.
 */
export function derivePublicFields(contractor: CmsContractor, today: string): CmsContractor {
  const legal = contractor.legalProfile
  const license = licenseStatusOf(legal, today)
  const partnershipStatus = partnershipStatusOf(contractor.partnership)
  const projects = contractor.featuredProjects.map((project) => ({
    ...project,
    // Ẩn dự án là tự bỏ nổi bật (§7).
    featured: project.hidden ? false : project.featured
  }))

  return {
    ...contractor,
    officeAddress: composeLocation(contractor.headquarters) || contractor.officeAddress,
    featuredProjects: projects,
    verifiedProjects: projects.filter((project) => project.verified).length,
    completedProjects: projects.length,
    surveyWithinHours: contractor.surveyCapable === false ? 0 : contractor.surveyWithinHours,
    legalProfile: legal
      ? {
          ...legal,
          taxCodeMasked: legal.taxCode ? maskCode(legal.taxCode) : legal.taxCodeMasked,
          registrationNumberMasked: legal.registrationNumber
            ? maskCode(legal.registrationNumber)
            : legal.registrationNumberMasked,
          registrationStatus: license === 'verified' ? 'verified' : 'pending'
        }
      : legal,
    partnership: {
      ...contractor.partnership,
      status: partnershipStatus,
      verified: partnershipStatus === 'verified' && contractor.partnership.docStatus !== 'pending'
    }
  }
}

/** Các thao tác được ghi vào lịch sử quản trị (§13) — lưu mã, giao diện dịch. */
export const CONTRACTOR_HISTORY_ACTIONS = [
  'created',
  'updated',
  'hidden',
  'shown',
  'acceptingOn',
  'acceptingOff',
  'verified',
  'unverified',
  'projectAdded',
  'projectUpdated',
  'projectHidden',
  'projectShown',
  'projectFeatured',
  'projectUnfeatured',
  'projectVerified',
  'projectUnverified',
  'legalUpdated',
  'licenseVerified',
  'licenseRejected',
  'licenseExpired',
  'partnershipUpdated'
] as const

export type ContractorHistoryAction = (typeof CONTRACTOR_HISTORY_ACTIONS)[number]

/**
 * Nhà thầu chỉ được xóa khi CHƯA phát sinh dự án, xác minh, lời mời hay hợp
 * tác (§11) — ngược lại phải dùng trạng thái Ẩn.
 */
export function hasRelatedData(contractor: CmsContractor, invitationCount: number): boolean {
  return (
    invitationCount > 0 ||
    contractor.featuredProjects.length > 0 ||
    contractor.verified ||
    partnershipStatusOf(contractor.partnership) !== 'none'
  )
}

/**
 * Chuẩn hóa dữ liệu form hồ sơ trước khi lưu: cắt khoảng trắng các trường chữ
 * (§3–§5) và giữ đúng 3 vị trí ảnh cố định, mỗi vị trí mang nhãn vai trò của nó
 * — ảnh trống ở vị trí nào thì chỉ vị trí đó trống.
 */
export function normalizeProfile(next: CmsContractor, photoCaptions: readonly string[]): CmsContractor {
  const trimLocation = <T extends CmsContractorLocation>(location: T): T => ({
    ...location,
    street: (location.street ?? '').trim()
  })
  return {
    ...next,
    name: next.name.trim(),
    kind: next.kind.trim(),
    shortDescription: next.shortDescription?.trim() || undefined,
    intro: next.intro.trim(),
    strengths: [...new Set(next.strengths.map((item) => item.trim()).filter(Boolean))],
    buildingTypeIds: [...new Set(next.buildingTypeIds ?? [])],
    scopes: [...new Set(next.scopes ?? [])],
    photos: photoCaptions.map((caption, index) => ({ url: next.photos[index]?.url || undefined, caption })),
    contact: next.contact
      ? {
          ...next.contact,
          person: next.contact.person.trim(),
          phone: next.contact.phone.trim(),
          email: next.contact.email.trim()
        }
      : next.contact,
    headquarters: next.headquarters ? trimLocation(next.headquarters) : next.headquarters,
    branches: (next.branches ?? []).map((branch) => ({ ...trimLocation(branch), name: branch.name.trim() })),
    surveyWithinHours: next.surveyCapable ? next.surveyWithinHours : 0
  }
}

/** Chỉ cho Đang hiển thị khi đã có ít nhất một chuyên môn, Loại công trình và Phạm vi thi công (§3). */
export function visibilityProblem(next: CmsContractor): boolean {
  return !next.hidden && (!next.strengths.length || !next.buildingTypeIds?.length || !next.scopes?.length)
}
