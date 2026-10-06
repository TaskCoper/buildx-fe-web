import { z } from 'zod'

/** DTO quản trị chỉ đọc theo TDD-SITE-003/005 và Response.StaffConstructionSiteItem.
 * Kiểm cấu trúc phần hồ sơ tại ranh giới API, không tự bù dữ liệu thiếu bằng số 0.
 */

/** Trạng thái một gói giám sát gắn với công trình (TDD-SITE-001). */
export const GRANT_STATES = ['Assigned', 'Completed', 'CanceledByStaff'] as const
export type KnownGrantState = (typeof GRANT_STATES)[number]

export interface SiteOwner {
  userId: string
  fullName: string
  email: string
}

export interface SiteGrant {
  grantId: string
  planName: string
  /** Giữ nguyên chuỗi BE trả; mã lạ hiện thô thay vì đoán. */
  state: string
  firstAssignedAtUtc: string | null
  assignedAtUtc: string | null
}

const expandedSiteSchema = z.object({
  profile: z.object({
    areaM2: z.string().regex(/^\d+(?:\.\d{1,2})?$/),
    addressDetail: z.string(),
    floorCount: z.number().int().positive().nullable(),
    hasTum: z.boolean().nullable(),
    architectureStyleId: z.string().uuid().nullable(),
    interiorStyleId: z.string().uuid().nullable()
  }),
  conditionName: z.string(),
  budgetVnd: z.string().regex(/^\d+$/),
  plannedStart: z.enum(['ASAP', 'Within1To3Months', 'Within3To6Months', 'Undecided']),
  provinceName: z.string(),
  wardName: z.string(),
  sourceEstimateId: z.string().uuid().nullable(),
  buildingTypeName: z.string(),
  architectureStyleName: z.string().nullable(),
  interiorStyleName: z.string().nullable(),
  files: z.array(
    z.object({
      id: z.string().uuid(),
      attachmentGroup: z.enum(['Drawing', 'ConditionPhoto']),
      originalName: z.string(),
      mediaType: z.string(),
      sizeBytes: z.number().int().nonnegative(),
      createdAtUtc: z.string()
    })
  )
})

export type AdminSiteAttachment = z.infer<typeof expandedSiteSchema>['files'][number]

/** Giữ chính xác số tiền/diện tích decimal của backend, kể cả lớn hơn MAX_SAFE_INTEGER. */
export function formatSiteDecimal(value: string, locale: string): string {
  const [whole = '0', fraction] = value.split('.')
  const grouped = new Intl.NumberFormat(locale).format(BigInt(whole))
  const separator =
    new Intl.NumberFormat(locale).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.'
  return fraction ? `${grouped}${separator}${fraction}` : grouped
}

export interface AdminConstructionSite extends z.infer<typeof expandedSiteSchema> {
  constructionSiteId: string
  name: string
  address: string
  version: number
  createdAtUtc: string
  updatedAtUtc: string
  /** Chỉ route admin có (người dùng chốt 25/09/2026 để nhân viên liên hệ khách). */
  owner: SiteOwner | null
  supervisionGrants: SiteGrant[]
  /** WGS84 (TDD-SITE-002). `null` khi BE không trả hoặc công trình cũ chưa có. */
  latitude: number | null
  longitude: number | null
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const nullableText = (value: unknown): string | null => text(value) || null
const numberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null
const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

export function normalizeGrant(raw: unknown): SiteGrant {
  const r = record(raw) ?? {}
  return {
    grantId: text(r.grantId),
    planName: text(r.planName),
    state: text(r.state),
    firstAssignedAtUtc: nullableText(r.firstAssignedAtUtc),
    assignedAtUtc: nullableText(r.assignedAtUtc)
  }
}

export function normalizeSite(raw: unknown): AdminConstructionSite {
  const r = record(raw) ?? {}
  const owner = record(r.owner)
  return {
    ...expandedSiteSchema.parse(raw),
    constructionSiteId: text(r.constructionSiteId) || text(r.id),
    name: text(r.name),
    address: text(r.address),
    version: typeof r.version === 'number' ? r.version : 0,
    createdAtUtc: text(r.createdAtUtc),
    updatedAtUtc: text(r.updatedAtUtc),
    owner: owner ? { userId: text(owner.userId), fullName: text(owner.fullName), email: text(owner.email) } : null,
    supervisionGrants: Array.isArray(r.supervisionGrants) ? r.supervisionGrants.map(normalizeGrant) : [],
    latitude: numberOrNull(r.latitude),
    longitude: numberOrNull(r.longitude)
  }
}

export function isKnownGrantState(state: string): state is KnownGrantState {
  return (GRANT_STATES as readonly string[]).includes(state)
}

export type GrantTone = 'info' | 'success' | 'off' | 'warning'

/**
 * Sắc thái thẻ trạng thái. Quy ước admin: "ngừng / đã hủy" là xám chứ KHÔNG đỏ (đỏ chỉ
 * cho lỗi thật); đang thực hiện là xanh dương, hoàn thành là xanh lá. Mã lạ → cảnh báo
 * vàng để người vận hành chú ý thay vì lẫn vào trạng thái bình thường.
 */
export function grantTone(state: string): GrantTone {
  switch (state) {
    case 'Assigned':
      return 'info'
    case 'Completed':
      return 'success'
    case 'CanceledByStaff':
      return 'off'
    default:
      return 'warning'
  }
}

/** "10.762622, 106.660172" hoặc `null` khi thiếu một trong hai. */
export function formatCoordinates(latitude: number | null, longitude: number | null): string | null {
  if (latitude === null || longitude === null) return null
  return `${latitude}, ${longitude}`
}

/** Liên kết bản đồ từ toạ độ — chỉ khi đủ cả hai và nằm trong miền hợp lệ của WGS84. */
export function mapLink(latitude: number | null, longitude: number | null): string | null {
  if (latitude === null || longitude === null) return null
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

export type SiteErrorKind = 'noPermission' | 'notFound' | 'other'

/**
 * Phân loại lỗi để hiện câu thân thiện thay vì thông điệp thô của BE.
 * - 403 (`ConstructionSiteNotInScope`, `AccessForbidden`, `MustChangePassword`…) → không có quyền.
 *   BE cố ý trả cùng 403 cho cả id không tồn tại khi ngoài phạm vi, để không dò được.
 * - 404 `ConstructionSiteNotFound` → không tìm thấy.
 */
export function classifySiteError(error: unknown): SiteErrorKind {
  const e = record(error)
  if (!e) return 'other'
  if (e.status === 403) return 'noPermission'
  if (e.status === 404 && (e.messageCode === 'ConstructionSiteNotFound' || e.messageCode === undefined))
    return 'notFound'
  return 'other'
}

/** Công trình có ít nhất một gói đang thực hiện (để đếm / tô nhấn trên bảng). */
export function activeGrantCount(site: Pick<AdminConstructionSite, 'supervisionGrants'>): number {
  return site.supervisionGrants.filter((grant) => grant.state === 'Assigned').length
}
