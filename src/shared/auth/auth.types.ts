import type { Role } from './auth.constants'

/** The authenticated user profile returned by the backend `/me` endpoint. */
export interface AuthUser {
  id: string
  email: string
  name: string
  /** Shown on the account screen (mục IV) and stamped onto the dossier header. */
  phone?: string
  avatarUrl?: string
  roles: Role[]
  /** Stable account type from /users/me; null means the API contract is unavailable. */
  accountKind: 'Customer' | 'Staff' | null
  /** Effective permissions of the current access token (BR-RBAC-001, BR-RBAC-009). */
  permissions: string[]
  /**
   * True khi tài khoản còn dùng mật khẩu do người khác đặt (nhân viên mới do
   * admin tạo). Theo BR-RBAC-006, backend chặn mọi chức năng khác cho tới khi
   * đổi mật khẩu, nên giao diện buộc đổi ngay sau khi đăng nhập.
   */
  mustChangePassword?: boolean
  /**
   * `false` khi email chưa xác minh. Backend chặn các chức năng cần email đã
   * xác minh, nên giao diện buộc nhập mã xác minh (gửi qua email) ngay sau khi
   * đăng nhập. `undefined` = không xác định được → không chặn.
   */
  emailVerified?: boolean
}

/** Client-side auth state held in the Zustand store. */
export interface AuthState {
  user: AuthUser | null
  /** True once the initial session check has resolved. */
  isInitialized: boolean
  isAuthenticated: boolean
}

export interface AuthActions {
  setUser: (user: AuthUser | null) => void
  setInitialized: (value: boolean) => void
  reset: () => void
}

export type AuthStore = AuthState & AuthActions
