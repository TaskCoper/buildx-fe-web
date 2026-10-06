import type { PermissionCode } from '@/shared/auth'
import { http } from '@/shared/lib/api'

/**
 * Vai trò & quyền (Roles) — mô hình RBAC người → vai trò → quyền
 * (STORY-RBAC-001, BR-RBAC-001..012). Mọi endpoint cần quyền `role.manage`.
 *
 * Danh mục mã quyền do hệ thống định nghĩa : người quản trị chỉ
 * CHỌN trong danh sách này, không tự đặt mã mới. Hiển thị `label` lấy từ API,
 * không hardcode.
 *
 * Quy tắc nghiệp vụ backend tự thực thi (FE không chặn trước, chỉ hiện thông báo):
 * - Vai trò `System` (Admin, Khách hàng) không sửa / đổi tên / xóa — 409 `RoleIsSystem`.
 * - Chỉ cấp được quyền mà chính actor đang có — 403 `PermissionNotHeldByActor`;
 *   thêm quyền vào vai trò actor đang giữ — 403 `SelfPrivilegeEscalation`.
 * - Xóa vai trò còn người giữ — 409 `RoleInUse`.
 * - Bỏ `supervision.complete` khi người giữ còn phụ trách gói — 409 `StaffHasActiveAssignments`.
 * - Tên trùng — 409 `RoleNameDuplicated`; mã quyền lạ — 422 `PermissionCodeUnknown`.
 */

export type { PermissionCode } from '@/shared/auth'

/** Một mã quyền trong danh mục hệ thống (`GET /permissions`). */
export interface PermissionItem {
  code: PermissionCode
  /** Nhãn hiển thị do backend cấp — dùng trực tiếp, không tự dịch. */
  label: string
  description?: string | null
  /**
   * `true` nghĩa là có quyền chưa đủ: người dùng còn phải được PHÂN CÔNG tài
   * nguyên mới thao tác được (BR-RBAC-010). Giao diện chỉ chú thích nhỏ.
   */
  requiresAssignment: boolean
}

export type RoleKind = 'System' | 'Custom'

/** Một dòng trong danh sách vai trò (`GET /roles`). */
export interface RoleSummary {
  id: string
  /** Mã ổn định của vai trò hệ thống (Admin/Khách hàng); vai trò tự tạo có thể trống. */
  code?: string | null
  name: string
  kind: RoleKind
  /** Số người đang giữ vai trò. */
  memberCount: number
  /** Mã quyền của vai trò. */
  permissions: string[]
}

/** Chi tiết một vai trò (`GET /roles/{id}`, và body trả về của POST/PUT). */
export interface RoleDetail extends RoleSummary {
  /**
   * Hạn access token (phút). Sau khi đổi quyền, người đang đăng nhập nhận bộ
   * quyền mới chậm nhất sau ngần này phút, khi token được cấp lại (BR-RBAC-009).
   */
  effectiveWithinMinutes: number
}

/** Body tạo vai trò tự tạo (`POST /roles`). */
export interface CreateRoleCommand {
  name: string
  permissions: string[]
}

/**
 * Body sửa vai trò (`PUT /roles/{id}`). `permissions` là danh sách MONG MUỐN
 * sau khi sửa (thay toàn bộ), không phải phần thêm vào.
 */
export interface UpdateRoleRequest {
  name?: string
  permissions?: string[]
}

interface RawRoleSummary {
  id?: string
  code?: string | null
  name?: string
  kind?: RoleKind
  memberCount?: number
  permissions?: string[] | null
}

interface RawRoleDetail extends RawRoleSummary {
  effectiveWithinMinutes?: number
}

function toSummary(raw: RawRoleSummary): RoleSummary {
  return {
    id: raw.id ?? '',
    code: raw.code ?? null,
    name: raw.name ?? '',
    kind: raw.kind ?? 'Custom',
    memberCount: raw.memberCount ?? 0,
    permissions: raw.permissions ?? []
  }
}

function toDetail(raw: RawRoleDetail): RoleDetail {
  return { ...toSummary(raw), effectiveWithinMinutes: raw.effectiveWithinMinutes ?? 0 }
}

/** Danh mục mã quyền kèm nhãn và cờ `requiresAssignment`. */
export async function listPermissions(): Promise<PermissionItem[]> {
  const rows = await http.get<PermissionItem[] | null>('/permissions')
  return rows ?? []
}

/** Danh sách vai trò (mảng thẳng, không phân trang). */
export async function listRoles(): Promise<RoleSummary[]> {
  const rows = await http.get<RawRoleSummary[] | null>('/roles')
  return (rows ?? []).map(toSummary)
}

/** Chi tiết một vai trò (kèm `effectiveWithinMinutes` và danh sách quyền hiện tại). */
export async function getRole(roleId: string): Promise<RoleDetail> {
  return toDetail(await http.get<RawRoleDetail>(`/roles/${roleId}`))
}

/** Tạo vai trò tự tạo. */
export async function createRole(body: CreateRoleCommand): Promise<RoleDetail> {
  return toDetail(await http.post<RawRoleDetail>('/roles', body))
}

/** Đổi tên và/hoặc đặt lại danh sách quyền của vai trò tự tạo. */
export async function updateRole(roleId: string, body: UpdateRoleRequest): Promise<RoleDetail> {
  return toDetail(await http.put<RawRoleDetail>(`/roles/${roleId}`, body))
}

/** Xóa vai trò tự tạo (chỉ khi không còn ai giữ — nếu còn, BE trả 409 `RoleInUse`). */
export function deleteRole(roleId: string): Promise<void> {
  return http.delete<void>(`/roles/${roleId}`)
}
