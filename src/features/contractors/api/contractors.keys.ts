import type { ContractorSearchFilters } from '@/shared/contractors'

/** Query-key factory cho feature `contractors` (S09–S18). */
export const contractorKeys = {
  all: ['contractors'] as const,

  directory: (filters: ContractorSearchFilters = {}) => [...contractorKeys.all, 'directory', filters] as const,

  /** Danh sách nhà thầu đề xuất cho một dự án (S12). */
  list: (projectId: string, filters: ContractorSearchFilters = {}) =>
    [...contractorKeys.all, 'list', projectId, filters] as const,
  /** Hồ sơ một nhà thầu (S13, S14). */
  detail: (contractorId: string) => [...contractorKeys.all, 'detail', contractorId] as const,
  /** Chi tiết một dự án trong hồ sơ nhà thầu (S13, hộp thoại dự án). */
  project: (contractorId: string, projectId: string) =>
    [...contractorKeys.all, 'project', contractorId, projectId] as const,

  briefs: () => [...contractorKeys.all, 'brief'] as const,
  selection: (userId?: string) => [...contractorKeys.all, 'selection', userId] as const,
  /** Danh sách hồ sơ dự án của tài khoản (S09 — nút "Xem nhà thầu"). */
  briefList: (userId?: string) => [...contractorKeys.briefs(), 'list', ...(userId ? [userId] : [])] as const,
  briefSummaries: (userId?: string) => [...contractorKeys.briefs(), 'summaries', ...(userId ? [userId] : [])] as const,
  /** Hồ sơ dự án đang dựng / đã lưu (S10, S11). */
  brief: (projectId: string, userId?: string) =>
    [...contractorKeys.briefs(), projectId, ...(userId ? [userId] : [])] as const,

  invitations: () => [...contractorKeys.all, 'invitations'] as const,
  /** Lời mời báo giá đã gửi của một dự án (S18). */
  invitationList: (projectId: string) => [...contractorKeys.invitations(), projectId] as const,
  /** Đánh giá nhà thầu của một dự án — mở form ở S18 sau khi lời mời hoàn tất. */
  reviewList: (projectId: string) => [...contractorKeys.all, 'reviews', projectId] as const,
  /** Một yêu cầu khảo sát vừa gửi (S17). */
  surveyRequest: (requestId: string) => [...contractorKeys.all, 'survey-request', requestId] as const,
  /** Khung giờ còn trống của một nhà thầu trong một ngày (S16). */
  slots: (contractorId: string, date: string) => [...contractorKeys.all, 'slots', contractorId, date] as const
} as const
