import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'

/**
 * Danh mục gói bán (Plan, BenefitDefinition) — quyền `plan.manage`.
 *
 * Mỗi gói có bản đang công bố và tối đa một bản nháp; sửa là ghi đè toàn bộ bản
 * nháp rồi Công bố. Khóa lạc quan bằng `version` (int) của gói: đọc chi tiết lấy
 * version rồi gửi lại ở `expectedVersion`, lệch thì 409 `PlanVersionConflict`.
 *
 * `GET /admin/plans` trả danh sách quản trị đầy đủ (mọi trạng thái bán), phân
 * trang và lọc theo `kind` / `saleState` phía server — nên màn KHÔNG còn ghi nhớ
 * id trên trình duyệt nữa. Chi tiết một gói (kèm offers + quyền lợi + 5 trường
 * trình bày thẻ) đọc qua `GET /admin/plans/{id}`.
 */

export type PlanKind = 'Design' | 'Supervision'
export type PlanSaleState = 'NotPublished' | 'OnSale' | 'Stopped'
export type PlanOfferKey = 'Month' | 'Year' | 'ConstructionSite'
/** Mã quyền hợp lệ của BE (danh mục `GET /admin/benefit-definitions`). */
export type PlanQuotaCode = 'design.generate' | 'catalog.detail' | 'design.render3d'

export interface BmtBenefitDefinition {
  id: string
  code: string
  label: string
  kind: 'Quota' | 'Boolean'
  usageKind: string
  scope: 'Design' | 'Supervision'
}

export interface BmtQuotaView {
  code: string
  label: string
  isUnlimited: boolean
  limit?: number | null
}

export interface BmtOfferView {
  offerKey: PlanOfferKey
  price: number
  currency: 'VND'
  quotas?: BmtQuotaView[] | null
}

export interface BmtDisplayBenefitView {
  code: string
  label: string
  enabled: boolean
  displayText: string
  sortOrder: number
}

/**
 * Bản đầy đủ của một phiên bản gói — dùng ở chi tiết / form. Đã gồm 5 trường
 * trình bày thẻ PHẲNG mà BE vừa deploy (không còn khối `presentation` lồng nhau).
 */
export interface BmtRevisionView {
  id: string
  number: number
  state: 'Draft' | 'Published'
  name: string
  description: string
  consultationText: string
  coverImageUrl?: string | null
  isHighlighted: boolean
  highlightLabel?: string | null
  giftDescription?: string | null
  giftConditions?: string | null
  publishedAtUtc?: string | null
  offers?: BmtOfferView[] | null
  displayBenefits?: BmtDisplayBenefitView[] | null
}

/** Bản rút gọn cho danh sách quản trị — không có offers / quyền lợi / quà. */
export interface BmtRevisionSummary {
  id: string
  number: number
  name: string
  coverImageUrl?: string | null
  isHighlighted: boolean
  highlightLabel?: string | null
}

/** Một dòng của `GET /admin/plans` (danh sách quản trị, mọi trạng thái bán). */
export interface BmtAdminPlanItem {
  planId: string
  code: string
  kind: PlanKind
  saleState: PlanSaleState
  version: number
  publishedRevision?: BmtRevisionSummary | null
  draft?: BmtRevisionSummary | null
}

/** Chi tiết một gói (`GET /admin/plans/{id}`). */
export interface BmtPlanDetail {
  planId: string
  code: string
  kind: PlanKind
  saleState: PlanSaleState
  version: number
  publishedRevision?: BmtRevisionView | null
  draft?: BmtRevisionView | null
}

export interface BmtPlanQuotaInput {
  code: PlanQuotaCode
  isUnlimited: boolean
  limit?: number | null
}

export interface BmtPlanOfferInput {
  offerKey: PlanOfferKey
  price: number
  currency: 'VND'
  quotas?: BmtPlanQuotaInput[]
}

export interface BmtPlanDisplayBenefitInput {
  code: string
  enabled: boolean
  displayText: string
  sortOrder: number
}

/**
 * Nội dung một bản nháp — dùng chung cho tạo gói và lưu nháp. Năm trường trình
 * bày thẻ (`coverImageUrl`, `isHighlighted`, `highlightLabel`, `giftDescription`,
 * `giftConditions`) nằm PHẲNG ngay trong thân request, đúng như BE nhận.
 */
export interface BmtPlanDraftContent {
  name: string
  description: string
  consultationText: string
  offers: BmtPlanOfferInput[]
  displayBenefits: BmtPlanDisplayBenefitInput[]
  coverImageUrl?: string | null
  isHighlighted: boolean
  highlightLabel?: string | null
  giftDescription?: string | null
  giftConditions?: string | null
}

export interface BmtCreatePlanRequest extends BmtPlanDraftContent {
  code: string
  kind: PlanKind
}

export interface BmtPlanSaved {
  planId: string
  version: number
  saleState: PlanSaleState
  draftState?: 'Draft' | 'Published' | null
}

export interface BmtPlanPublished {
  planId: string
  revisionId: string
  revisionNumber: number
  version: number
  saleState: PlanSaleState
}

/** Tham số lọc / phân trang cho danh sách quản trị. */
export interface AdminPlanListParams {
  kind?: PlanKind
  saleState?: PlanSaleState
  pageIndex: number
  pageSize: number
}

export const bmtPlansApi = {
  /** `GET /admin/plans` — danh sách quản trị, phân trang & lọc phía server. */
  listForAdmin: ({ kind, saleState, pageIndex, pageSize }: AdminPlanListParams) =>
    http.get<PagedResult<BmtAdminPlanItem>>('/admin/plans', {
      params: { kind, saleState, pageIndex, pageSize }
    }),

  getPlan: (planId: string) => http.get<BmtPlanDetail>(`/admin/plans/${planId}`),

  createPlan: (body: BmtCreatePlanRequest) => http.post<BmtPlanSaved>('/admin/plans', body),

  saveDraft: (planId: string, body: BmtPlanDraftContent & { expectedVersion: number }) =>
    http.put<BmtPlanSaved>(`/admin/plans/${planId}/draft`, body),

  publish: (planId: string, expectedVersion: number) =>
    http.post<BmtPlanPublished>(`/admin/plans/${planId}/publish`, { expectedVersion }),

  stopSelling: (planId: string, expectedVersion: number) =>
    http.post<BmtPlanSaved>(`/admin/plans/${planId}/stop-selling`, { expectedVersion }),

  listBenefitDefinitions: () => http.get<BmtBenefitDefinition[]>('/admin/benefit-definitions')
}
