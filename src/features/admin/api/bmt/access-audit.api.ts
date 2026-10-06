import { http } from '@/shared/lib/api'
import type { PagedResult } from '@/shared/types'

/**
 * NHẬT KÝ TRUY CẬP / THAY ĐỔI QUYỀN (AccessAuditLog — STORY-RBAC-004,
 * TDD-RBAC-001, BR-RBAC-012). Chỉ ghi thêm, chỉ đọc; cần quyền `audit.read`.
 *
 * Mỗi dòng là một lần thao tác vai trò / quyền / phân công, kể cả lần bị từ chối
 * (Outcome = Rejected). Danh sách gọn (không kèm before/after); xem một bản ghi
 * mới trả `before`/`after`. Swagger để trống response nên kiểu dựng theo Examples
 * của TDD-RBAC-001.
 */
export interface AccessAuditItem {
  id: string
  actorUserId: string
  actorName: string
  /** RoleCreated, RoleUpdated, RoleDeleted, RoleGranted, RoleRevoked, StaffCreated… */
  action: string
  /** Role | User | Assignment */
  targetType: string
  targetId?: string | null
  /** Ảnh chụp tên đối tượng lúc thao tác (đọc được cả khi đối tượng đã xoá). */
  targetLabel: string
  /** Succeeded | Rejected */
  outcome: string
  rejectReasonCode?: string | null
  occurredAtUtc: string
}

export interface AccessAuditDetail extends AccessAuditItem {
  before?: unknown
  after?: unknown
}

export interface AccessAuditListParams {
  actorUserId?: string
  targetType?: string
  targetId?: string
  fromUtc?: string
  toUtc?: string
  pageIndex: number
  pageSize: number
}

const BASE = '/access-audit'

export const accessAuditApi = {
  list: (params: AccessAuditListParams) => http.get<PagedResult<AccessAuditItem>>(BASE, { params }),

  get: (id: string) => http.get<AccessAuditDetail>(`${BASE}/${id}`)
}
