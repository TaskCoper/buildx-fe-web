import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'

/**
 * Tư vấn KTS — hồ sơ KTS, danh mục chuyên môn và yêu cầu tư vấn
 * (ArchitectAdmin, ArchitectCategoryAdmin, ConsultationRequestAdmin).
 * Quyền `consultation.manage`. Khóa lạc quan bằng `version` (uuid) đọc từ API.
 */

export interface BmtArchitectCategory {
  id: string
  name: string
  version: string
}

export interface BmtAdminArchitect {
  id: string
  fullName: string
  title: string
  avatarUrl: string
  yearsExperience: number
  projectCount: number
  introduction: string
  /** Sắp theo tên rồi Id. */
  categories: { id: string; name: string }[]
  isVisible: boolean
  version: string
  createdOnUtc: string
  modifiedOnUtc?: string | null
}

/**
 * Chi tiết KTS (admin). `companyName`/`rating`/`reviewCount` chỉ có ở bản chi
 * tiết (và body ghi), danh sách không trả — tất cả nullable.
 */
export interface BmtAdminArchitectDetail extends BmtAdminArchitect {
  categoryIds: string[]
  companyName?: string | null
  rating?: number | null
  reviewCount?: number | null
}

/** Hồ sơ KTS — PUT thay toàn bộ hồ sơ, tập category và trạng thái Ẩn/Hiện. */
export interface BmtArchitectWrite {
  fullName: string
  title: string
  avatarUrl: string
  yearsExperience: number
  projectCount: number
  introduction: string
  categoryIds: string[]
  isVisible: boolean
  /** Tên công ty (nullable — tạo mới có thể bỏ trống). */
  companyName?: string | null
  /** Điểm đánh giá 0–5, một chữ số thập phân (nullable). */
  rating?: number | null
  /** Số lượt đánh giá (nullable). */
  reviewCount?: number | null
}

export type ConsultationRequestStatus = 'Pending' | 'Resolved'

export interface BmtConsultationRequestItem {
  id: string
  customerId: string
  customerName: string
  architectId: string
  architectName: string
  /** UTC; giao diện hiển thị theo giờ Việt Nam. */
  desiredAtUtc: string
  /** Số liên lạc trên đơn, có thể khác số trong tài khoản. */
  contactPhone: string
  status: ConsultationRequestStatus
  createdOnUtc: string
  version: string
}

export interface BmtConsultationRequestDetail extends BmtConsultationRequestItem {
  message?: string | null
  internalNote?: string | null
  modifiedOnUtc?: string | null
}

export interface BmtSaved {
  id: string
  version: string
}

/** Giới hạn độ dài theo TDD-CONSULT-001 (Data Model). */
export const CONSULT_LIMITS = {
  fullName: 200,
  title: 200,
  companyName: 200,
  avatarUrl: 2048,
  introduction: 5000,
  categoryName: 200,
  internalNote: 5000
} as const

/** Trần `pageSize` của mọi danh sách BMT. */
const MAX_PAGE_SIZE = 100

export const consultAdminApi = {
  listArchitects: (params: { pageIndex: number; pageSize: number; isVisible?: boolean }) =>
    http.get<PagedResult<BmtAdminArchitect>>('/admin/architects', { params }),

  getArchitect: (id: string) => http.get<BmtAdminArchitectDetail>(`/admin/architects/${id}`),

  createArchitect: (body: BmtArchitectWrite) => http.post<BmtSaved>('/admin/architects', body),

  updateArchitect: (id: string, body: BmtArchitectWrite & { expectedVersion: string }) =>
    http.put<BmtSaved>(`/admin/architects/${id}`, body),

  listCategories: (params: { pageIndex: number; pageSize: number }) =>
    http.get<PagedResult<BmtArchitectCategory>>('/admin/architect-categories', { params }),

  /** Mọi category chuyên môn (đọc hết các trang), sắp theo tên. */
  listAllCategories: async (): Promise<BmtArchitectCategory[]> => {
    const all: BmtArchitectCategory[] = []
    for (let pageIndex = 1; ; pageIndex += 1) {
      const page = await consultAdminApi.listCategories({ pageIndex, pageSize: MAX_PAGE_SIZE })
      all.push(...page.items)
      if (!page.hasNextPage) return all
    }
  },

  createCategory: (name: string) => http.post<BmtArchitectCategory>('/admin/architect-categories', { name }),

  renameCategory: (id: string, name: string, expectedVersion: string) =>
    http.put<BmtArchitectCategory>(`/admin/architect-categories/${id}`, { name, expectedVersion }),

  /** Body JSON mang `expectedVersion` (không phải query như bên Tin tức). */
  deleteCategory: (id: string, expectedVersion: string) =>
    http.delete<void>(`/admin/architect-categories/${id}`, { data: { expectedVersion } }),

  listRequests: (params: { pageIndex: number; pageSize: number; status?: ConsultationRequestStatus }) =>
    http.get<PagedResult<BmtConsultationRequestItem>>('/admin/consultation-requests', { params }),

  getRequest: (id: string) => http.get<BmtConsultationRequestDetail>(`/admin/consultation-requests/${id}`),

  /** Cập nhật nguyên khối phần xử lý: `internalNote` luôn có mặt (null = xóa ghi chú). */
  updateRequest: (
    id: string,
    body: { status: ConsultationRequestStatus; internalNote: string | null; expectedVersion: string }
  ) => http.patch<BmtSaved>(`/admin/consultation-requests/${id}`, body)
}
