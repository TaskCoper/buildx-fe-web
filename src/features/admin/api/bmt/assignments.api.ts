import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'

/**
 * Phân công gói giám sát (STORY-RBAC-003, TDD-RBAC-003) — quyền `assignment.manage`.
 *
 * Đợt này chỉ có MỘT loại tài nguyên phân công được: gói giám sát
 * (`resourceType: "SupervisionGrant"`), mỗi gói tại một thời điểm chỉ một người
 * phụ trách (BR-RBAC-013). Muốn đổi người thì CHUYỂN GIAO (`/transfer`), không
 * tạo phân công thứ hai.
 *
 * Hạn chế API: KHÔNG có endpoint admin liệt kê toàn bộ supervision-grant. Màn
 * chỉ dựa vào `GET /assignments` (các phân công đã tạo) và
 * `GET /assignments/needs-reassignment` (gói đang gán mà chưa có / mất người
 * phụ trách). Không có `/assignments/{id}` chi tiết.
 */

/** Loại tài nguyên phân công — hiện chỉ có gói giám sát. */
export type AssignmentResourceType = 'SupervisionGrant'

/** Lý do một dòng phân công kết thúc hiệu lực. NULL khi dòng còn hiệu lực. */
export type AssignmentEndReason = 'Transferred' | 'Removed' | 'PackageCanceled' | 'PackageUnassigned'

export interface BmtAssignmentItem {
  id: string
  staffUserId: string
  /** Tên nhân viên lúc đọc. NULL khi tài khoản đã bị xóa. */
  staffName?: string | null
  resourceType: AssignmentResourceType
  /** Mã gói giám sát. */
  resourceId: string
  effectiveFromUtc: string
  /** NULL = đang phụ trách. */
  effectiveToUtc?: string | null
  endReason?: AssignmentEndReason | null
}

/** Gói giám sát cần chia lại: chưa có người hoặc người phụ trách đang bị khóa. */
export interface BmtNeedsReassignmentItem {
  supervisionGrantId: string
  constructionSiteId: string
  /** Tên công trình hiện tại, đọc lúc trả về. */
  constructionSiteName: string
  /** Khách hàng sở hữu gói. */
  customerUserId: string
  status: 'NoAssignee' | 'AssigneeLocked'
  /** Phân công đang hiệu lực của người bị khóa. NULL khi gói chưa có người phụ trách. */
  assignmentId?: string | null
  staffUserId?: string | null
}

export interface BmtCreateAssignmentCommand {
  staffUserId: string
  resourceType: AssignmentResourceType
  resourceId: string
}

export interface BmtAssignmentCreated {
  id: string
  staffUserId: string
  resourceType: AssignmentResourceType
  resourceId: string
  effectiveFromUtc: string
  effectiveToUtc?: string | null
}

export interface BmtAssignmentTransferred {
  endedAssignmentId: string
  newAssignmentId: string
  /** Dòng cũ kết thúc và dòng mới bắt đầu tại đúng mốc này. */
  effectiveAtUtc: string
}

/** Tài khoản nhân viên — dùng để chọn người nhận phân công (`GET /staff`). */
export interface BmtStaffItem {
  userId: string
  email: string
  firstName: string
  lastName: string
  status: 'Active' | 'Locked'
  mustChangePassword: boolean
  roles?: { id: string; name: string }[]
}

export interface ListAssignmentsParams {
  pageIndex: number
  pageSize: number
  staffUserId?: string
  resourceType?: AssignmentResourceType
  resourceId?: string
  /** true = chỉ dòng đang hiệu lực. */
  activeOnly?: boolean
}

export const assignmentsAdminApi = {
  /** Danh sách phân công — phân trang thật ở server, lọc theo nhân viên / hiệu lực. */
  listAssignments: (params: ListAssignmentsParams) =>
    http.get<PagedResult<BmtAssignmentItem>>('/assignments', { params }),

  /**
   * Phân công một gói giám sát cho nhân viên. Gói không tồn tại → 404
   * `AssignmentResourceNotFound`; gói chưa gán công trình / đang hủy → 409
   * `ResourceNotAssignable`; gói đã có người → 409 `ResourceAlreadyAssigned`;
   * người nhận không hợp lệ → 409 `AssignmentTargetInvalid`.
   */
  createAssignment: (body: BmtCreateAssignmentCommand) => http.post<BmtAssignmentCreated>('/assignments', body),

  /** Gói giám sát cần chia lại (gói gán lâu nhất lên đầu). */
  listNeedsReassignment: (params: { pageIndex: number; pageSize: number }) =>
    http.get<PagedResult<BmtNeedsReassignmentItem>>('/assignments/needs-reassignment', { params }),

  /**
   * Chuyển giao phân công sang nhân viên khác. Phân công đã kết thúc → 409
   * `AssignmentAlreadyEnded`; chuyển cho chính người đang phụ trách → 409
   * `DuplicateAssignment`.
   */
  transferAssignment: (assignmentId: string, body: { toStaffUserId: string }) =>
    http.post<BmtAssignmentTransferred>(`/assignments/${assignmentId}/transfer`, body),

  /** Gỡ phân công (không chuyển cho ai). Gói đang gán sẽ vào danh sách cần chia lại. */
  deleteAssignment: (assignmentId: string) => http.delete<void>(`/assignments/${assignmentId}`),

  /** Danh sách tài khoản nhân viên để chọn người nhận (`GET /staff`, cần `user.manage`). */
  listStaff: () => http.get<BmtStaffItem[]>('/staff')
}
