import { env } from '@/shared/config/env'
import type { Invitation, ProjectBrief, SurveyRequest } from '../types/contractor.types'
import { bmtContractorsApi } from './contractors.bmt'
import { mockContractorsApi } from './contractors.mock'
import { constructionBriefsApi } from './construction-briefs.api'

/** Dữ liệu ghi xuống khi lưu Bước 1 (S10). */
export type SaveBriefPayload = Omit<
  ProjectBrief,
  'id' | 'userId' | 'ownershipVersion' | 'createdAt' | 'updatedAt' | 'status'
>

/**
 * "Tạo hồ sơ từ gói" (S09, ★ mục 9) — sinh hồ sơ bằng dữ liệu đã có từ dự án
 * thiết kế, bỏ qua Bước 1 nhập liệu thủ công.
 */
export interface CreateBriefFromDesignPayload {
  designProjectId: string
  name: string
  buildingType: string
  landArea: number
}

/** Kết quả màn "Đã gửi lời mời" (S17) — một yêu cầu, tối đa 3 lời mời (R1). */
export interface SurveyRequestDetail {
  request: SurveyRequest
  invitations: Invitation[]
}

/** SITE and public directory API. RFQ uses quotationRequestsApi directly; legacy batch/survey APIs are mock-only. */
function legacyQuotationUnavailable(): Promise<never> {
  return Promise.reject(new Error('UseQuotationRequestsApi'))
}
const BmtContractorsApi = {
  ...constructionBriefsApi,
  listInvitations: legacyQuotationUnavailable,
  createInvitations: legacyQuotationUnavailable,
  getSurveyRequest: legacyQuotationUnavailable,
  listSlots: legacyQuotationUnavailable,
  listContractors: bmtContractorsApi.listContractors,
  getContractor: bmtContractorsApi.getContractor,
  getContractorProject: bmtContractorsApi.getContractorProject
} satisfies Partial<typeof mockContractorsApi>

export const contractorsApi = env.NEXT_PUBLIC_USE_MOCK_API
  ? { ...mockContractorsApi, ...constructionBriefsApi }
  : { ...mockContractorsApi, ...BmtContractorsApi }
