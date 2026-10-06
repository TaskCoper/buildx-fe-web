/**
 * Công trình của khách (STORY-SITE-001, TDD-SITE-001) + gói giám sát
 * (STORY-SUB-003/004, TDD-SUB-004). Toạ độ chưa có ở bản này của API — chỉ
 * tên + địa chỉ; geocoding là cập nhật sau (TDD-SITE-002).
 */

export type SiteGrantState = 'Assigned' | 'Completed' | 'CanceledByStaff'

/** Gói giám sát đang trỏ vào một công trình (nhúng trong Site). */
export interface SiteGrant {
  grantId: string
  planName: string
  state: SiteGrantState
  firstAssignedAtUtc: string | null
  assignedAtUtc: string | null
}

export interface ConstructionSite {
  constructionSiteId: string
  name: string
  address: string
  /**
   * Swagger BE không mô tả thân phản hồi nên chưa rõ có trả toạ độ hay không —
   * khai tuỳ chọn: có thì form sửa dùng lại, không có thì bắt chọn lại địa chỉ
   * (PUT vẫn đòi đủ hai trường).
   */
  latitude?: number | null
  longitude?: number | null
  version: number
  createdAtUtc: string
  updatedAtUtc: string
  supervisionGrants: SiteGrant[]
}

/**
 * Backend BẮT BUỘC `latitude` + `longitude` khi tạo/sửa công trình (swagger:
 * `required: ["latitude","longitude"]`, và BR-SITE-001/002) — frontend chịu
 * trách nhiệm tra toạ độ từ địa chỉ, xem `shared/geocode`. Thiếu là BE từ chối.
 */
export interface SiteInput {
  name: string
  address: string
  latitude: number
  longitude: number
}

/** Trạng thái gói giám sát của khách (TDD-SUB-004). */
export type GrantState = 'Unassigned' | 'Assigned' | 'Completed' | 'CanceledByStaff'

export interface SupervisionGrant {
  grantId: string
  revisionId?: string
  constructionSiteId: string | null
  constructionSiteName: string | null
  state: GrantState
  effectiveState: string
  grantedAtUtc: string
  assignmentDeadlineUtc: string | null
  firstAssignedAtUtc: string | null
  assignedAtUtc: string | null
  version: number
}
