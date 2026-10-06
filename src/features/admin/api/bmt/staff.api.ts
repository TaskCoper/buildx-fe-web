import { http } from '@/shared/lib/api'

/**
 * TÀI KHOẢN NHÂN VIÊN (STORY-RBAC-002) — dữ liệu trên BMT API.
 *
 * Người quản trị tạo tài khoản nhân viên, gán / thu hồi vai trò, khóa / mở khóa
 * và buộc đăng xuất. Tạo tài khoản cần quyền `user.manage` + `role.manage`; gán /
 * thu hồi vai trò cần `role.manage`; khóa / mở khóa / buộc đăng xuất cần
 * `user.manage`.
 *
 * Danh sách trả về MẢNG THẲNG (không phân trang) — màn tự bọc thành `PagedResult`
 * giả và lọc tại client. Riêng `GET /roles` khai ở đây để form tạo nhân viên lấy
 * được danh sách vai trò mà không phụ thuộc chéo sang `roles.api.ts`.
 *
 * Mật khẩu do BE sinh (`generatedPassword`) chỉ trả MỘT LẦN ở phản hồi tạo tài
 * khoản; không endpoint nào xem lại được (BR-RBAC-006).
 */

export type StaffStatusValue = 'Active' | 'Locked'
export type RoleKind = 'System' | 'Custom'

/** Vai trò tối giản gắn trên một nhân viên (Response.RoleRef). */
export interface StaffRoleRef {
  id: string
  name: string
}

/** Response.StaffItem — một dòng trong bảng nhân viên. */
export interface StaffItem {
  userId: string
  email: string
  firstName: string
  lastName: string
  status: StaffStatusValue
  /** true = tài khoản còn dùng mật khẩu do người quản trị biết, chưa đổi lần đầu. */
  mustChangePassword: boolean
  roles: StaffRoleRef[]
}

/** Response.RoleSummary — dùng cho ô chọn vai trò trong form. */
export interface RoleSummary {
  id: string
  code: string | null
  name: string
  kind: RoleKind
  memberCount: number
  permissions: string[]
}

/** Command.CreateStaffCommand. */
export interface CreateStaffInput {
  email: string
  firstName: string
  lastName: string
  roleIds: string[]
}

/** Response.StaffCreated — kèm mật khẩu bản rõ hiển thị một lần. */
export interface StaffCreated {
  userId: string
  email: string
  status: StaffStatusValue
  mustChangePassword: boolean
  generatedPassword: string
  roles: StaffRoleRef[]
}

/** Response.StaffStatus — kết quả khóa / mở khóa. */
export interface StaffStatus {
  userId: string
  status: StaffStatusValue
  sessionsRevoked: boolean
  /** Số gói giám sát người này còn phụ trách — nhắc chia lại (BR-RBAC-013). */
  activeAssignmentCount: number
}

interface RawRoleRef {
  id?: string
  name?: string | null
}

interface RawStaffItem {
  userId?: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  status?: StaffStatusValue
  mustChangePassword?: boolean
  roles?: RawRoleRef[] | null
}

interface RawRoleSummary {
  id?: string
  code?: string | null
  name?: string | null
  kind?: RoleKind
  memberCount?: number
  permissions?: string[] | null
}

interface RawStaffCreated extends RawStaffItem {
  generatedPassword?: string | null
}

interface RawStaffStatus {
  userId?: string
  status?: StaffStatusValue
  sessionsRevoked?: boolean
  activeAssignmentCount?: number
}

const STAFF_BASE = '/staff'

function toRoleRef(raw: RawRoleRef): StaffRoleRef {
  return { id: raw.id ?? '', name: raw.name ?? '' }
}

function toStaffItem(raw: RawStaffItem): StaffItem {
  return {
    userId: raw.userId ?? '',
    email: raw.email ?? '',
    firstName: raw.firstName ?? '',
    lastName: raw.lastName ?? '',
    status: raw.status ?? 'Active',
    mustChangePassword: Boolean(raw.mustChangePassword),
    roles: (raw.roles ?? []).map(toRoleRef)
  }
}

function toRoleSummary(raw: RawRoleSummary): RoleSummary {
  return {
    id: raw.id ?? '',
    code: raw.code ?? null,
    name: raw.name ?? '',
    kind: raw.kind ?? 'Custom',
    memberCount: raw.memberCount ?? 0,
    permissions: raw.permissions ?? []
  }
}

function toStaffStatus(raw: RawStaffStatus): StaffStatus {
  return {
    userId: raw.userId ?? '',
    status: raw.status ?? 'Active',
    sessionsRevoked: Boolean(raw.sessionsRevoked),
    activeAssignmentCount: raw.activeAssignmentCount ?? 0
  }
}

/** Toàn bộ tài khoản nhân viên (mảng thẳng). Cần quyền `user.manage`. */
export async function listStaff(): Promise<StaffItem[]> {
  const res = await http.get<RawStaffItem[]>(STAFF_BASE)
  return (res ?? []).map(toStaffItem)
}

/**
 * Danh sách vai trò để form chọn (GET /roles). Cần quyền `role.manage`. Khai tại
 * chỗ để không phụ thuộc chéo sang màn Vai trò của agent khác.
 */
export async function listRoles(): Promise<RoleSummary[]> {
  const res = await http.get<RawRoleSummary[]>('/roles')
  return (res ?? []).map(toRoleSummary)
}

/** Tạo tài khoản nhân viên. Cần `user.manage` + `role.manage`. */
export async function createStaff(input: CreateStaffInput): Promise<StaffCreated> {
  const res = await http.post<RawStaffCreated>(STAFF_BASE, input)
  return {
    ...toStaffItem(res),
    generatedPassword: res.generatedPassword ?? ''
  }
}

/** Gán một vai trò cho nhân viên. Cần `role.manage`. */
export function grantRole(userId: string, roleId: string): Promise<void> {
  return http.post<void>(`${STAFF_BASE}/${userId}/roles`, { roleId })
}

/** Thu hồi một vai trò của nhân viên. Cần `role.manage`. */
export function revokeRole(userId: string, roleId: string): Promise<void> {
  return http.delete<void>(`${STAFF_BASE}/${userId}/roles/${roleId}`)
}

/** Khóa tài khoản (cắt phiên ngay). Cần `user.manage`. */
export async function lockStaff(userId: string): Promise<StaffStatus> {
  const res = await http.post<RawStaffStatus>(`${STAFF_BASE}/${userId}/lock`)
  return toStaffStatus(res)
}

/** Mở khóa tài khoản. Cần `user.manage`. */
export async function unlockStaff(userId: string): Promise<StaffStatus> {
  const res = await http.post<RawStaffStatus>(`${STAFF_BASE}/${userId}/unlock`)
  return toStaffStatus(res)
}

/** Buộc đăng xuất (cắt mọi phiên, không đổi trạng thái tài khoản). Cần `user.manage`. */
export function forceLogout(userId: string): Promise<void> {
  return http.post<void>(`${STAFF_BASE}/${userId}/force-logout`)
}
