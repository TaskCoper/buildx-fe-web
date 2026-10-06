import { z } from 'zod'
import type { AuthUser } from '@/shared/auth'
import { AUTH_ENDPOINTS, ROLES, clearSessionMarker, hasSessionMarker, setSessionMarker } from '@/shared/auth'
import { env } from '@/shared/config/env'
import { http } from '@/shared/lib/api'
import type { ApiError } from '@/shared/types'
import type { ChangePasswordPayload, LoginPayload, LoginResponse, RegisterPayload } from '../types/auth.types'
import { mockAuthApi } from './auth.mock'

/** `GET /users/me` of the BMT API (`Response.GetMeBasic`). */
const meSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  avatar: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  roles: z.array(z.string()).nullish(),
  roleCodes: z.array(z.string()).nullish(),
  accountKind: z.enum(['Customer', 'Staff']).nullish(),
  permissions: z.array(z.string()).nullish(),
  mustChangePassword: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
  authenticationMethod: z.string().optional()
})

type BmtMe = z.infer<typeof meSchema>

function toRoles(me: BmtMe): AuthUser['roles'] {
  if (me.accountKind === 'Customer') return [ROLES.CUSTOMER]
  if (me.accountKind !== 'Staff') return []
  return (me.roleCodes ?? []).includes('admin') ? [ROLES.STAFF, ROLES.ADMIN] : [ROLES.STAFF]
}

function toAuthUser(me: BmtMe): AuthUser {
  return {
    id: me.id,
    email: me.email,
    // Vietnamese order: họ (lastName) before tên (firstName).
    // A one-word name is stored as họ = tên (BE requires both), so show it once.
    name:
      (me.lastName === me.firstName ? me.firstName : [me.lastName, me.firstName].filter(Boolean).join(' ')).trim() ||
      me.email,
    phone: me.phoneNumber ?? undefined,
    avatarUrl: me.avatar ?? undefined,
    roles: toRoles(me),
    accountKind: me.accountKind ?? null,
    permissions: [...new Set(me.permissions ?? [])],
    mustChangePassword: me.mustChangePassword ?? false,
    // Không có field (BE cũ) → coi như đã xác minh để không chặn nhầm.
    emailVerified: me.isEmailVerified ?? true
  }
}

/**
 * The register form has a single full-name field; BMT wants họ/tên apart.
 * The last word is the given name, the rest the family name.
 */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const words = fullName.trim().split(/\s+/)
  const firstName = words.pop() ?? ''
  return { firstName, lastName: words.join(' ') || firstName }
}

async function getCurrentUser(signal?: AbortSignal): Promise<AuthUser> {
  // No marker = never logged in on this browser (or logged out): skip the
  // `/me` → 401 → refresh → 401 round trips every guest page load would pay.
  if (!hasSessionMarker()) {
    const error: ApiError = { status: 401, message: 'No active session.' }
    throw error
  }
  const me = meSchema.parse(await http.get<unknown>(AUTH_ENDPOINTS.ME, { signal }))
  if (me.authenticationMethod === 'PasswordReset') {
    clearSessionMarker()
    const error: ApiError = { status: 401, message: 'Password reset session.' }
    throw error
  }
  const user = toAuthUser(me)
  setSessionMarker()
  return user
}

/**
 * Auth feature API surface over the BMT `/users/*` endpoints. Login sets the
 * httpOnly token cookies and returns no profile, so it is followed by `/me`.
 *
 * While there is no backend, set `NEXT_PUBLIC_USE_MOCK_AUTH=true` to route
 * these through an in-browser mock (see {@link mockAuthApi}).
 */
const AuthApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    await http.post(AUTH_ENDPOINTS.LOGIN, { email: payload.email, password: payload.password })
    // Login just set the token cookies, so mark the session BEFORE `/me` —
    // otherwise `getCurrentUser`'s guest short-circuit would reject it.
    setSessionMarker()
    return { user: await getCurrentUser() }
  },

  logout: async (): Promise<void> => {
    try {
      await http.post<void>(AUTH_ENDPOINTS.LOGOUT)
    } finally {
      clearSessionMarker()
    }
  },

  getCurrentUser,

  register: (payload: RegisterPayload) =>
    http.post<void>(AUTH_ENDPOINTS.REGISTER, {
      email: payload.email,
      password: payload.password,
      ...splitName(payload.name)
    }),

  /** Xác minh email bằng mã gửi qua email (STORY-AUTH-001 ALT-01). */
  verifyAccount: (email: string, code: number): Promise<void> =>
    http.post<void>(AUTH_ENDPOINTS.VERIFY_ACCOUNT, { email, code }),

  /** Gửi lại mã xác minh email (`email` là query param, không phải body). */
  resendVerifyCode: (email: string): Promise<void> =>
    http.post<void>(AUTH_ENDPOINTS.RESEND_VERIFY_CODE, undefined, { params: { email } }),

  /**
   * Đổi mật khẩu (dùng cho luồng bắt buộc đổi lần đầu, BR-RBAC-006). Backend thu
   * hồi phiên hiện tại sau khi đổi, nên caller phải đăng nhập lại bằng mật khẩu
   * mới (xem {@link relogin}).
   */
  changePassword: (payload: ChangePasswordPayload) =>
    http.post<string>(AUTH_ENDPOINTS.CHANGE_PASSWORD, {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword
    }),

  /**
   * Luồng QUÊN MẬT KHẨU (STORY-AUTH-001 ALT-02, BR-AUTH-002) — 3 bước:
   *
   * 1. `requestPasswordReset(email)` → BE gửi mã quên mật khẩu qua email.
   * 2. `verifyResetCode(email, code)` → mã đúng + tài khoản khách → BE cấp
   *    **phiên quên mật khẩu** qua cookie (như web). Phiên này chỉ dùng để đặt
   *    mật khẩu mới, bị từ chối ở các chức năng thường — nên KHÔNG đánh dấu
   *    session marker (tránh `getCurrentUser` gọi `/me`).
   * 3. `resetPassword(newPassword)` → `change_password` với `currentPassword=null`
   *    bằng phiên vừa cấp. BE cắt MỌI phiên (kể cả phiên quên MK), nên xóa marker
   *    và điều hướng người dùng đăng nhập lại.
   */
  requestPasswordReset: (email: string): Promise<void> => http.post<void>(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email }),

  verifyResetCode: (email: string, code: number): Promise<void> =>
    http.post<void>(AUTH_ENDPOINTS.VERIFY_RESET_CODE, { email, code }),

  resetPassword: async (newPassword: string): Promise<void> => {
    await http.post<void>(AUTH_ENDPOINTS.CHANGE_PASSWORD, { currentPassword: null, newPassword })
    clearSessionMarker()
  },

  /** Đăng nhập lại ngay sau khi đổi mật khẩu, trả hồ sơ đã cập nhật. */
  relogin: async (email: string, password: string): Promise<LoginResponse> => {
    await http.post(AUTH_ENDPOINTS.LOGIN, { email, password })
    setSessionMarker()
    return { user: await getCurrentUser() }
  }
}

export const authApi = env.NEXT_PUBLIC_USE_MOCK_AUTH ? mockAuthApi : AuthApi
