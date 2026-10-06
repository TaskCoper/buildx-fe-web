/** Personas used for frontend routing; custom backend roles grant permissions. */
export const ROLES = {
  GUEST: 'guest',
  CUSTOMER: 'customer',
  STAFF: 'staff',
  ADMIN: 'admin'
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ALL_ROLES: readonly Role[] = Object.values(ROLES)

/**
 * Name of the non-sensitive marker cookie the proxy checks to guard routes.
 * The BMT API keeps its real tokens in httpOnly cookies (`accessToken`,
 * `refreshToken`) whose lifetime the frontend can't see, so the client sets
 * this marker itself after a confirmed login / `/users/me` and clears it on
 * logout or an unrecoverable 401 (see `session-marker.ts`).
 */
export const AUTH_COOKIE_NAME = 'bmt.auth'

/** Auth endpoints of the BMT API, relative to `NEXT_PUBLIC_API_BASE_URL`. */
export const AUTH_ENDPOINTS = {
  LOGIN: '/users/login',
  REFRESH: '/users/refresh_token',
  LOGOUT: '/users/logout',
  REGISTER: '/users/register',
  CHANGE_PASSWORD: '/users/change_password',
  FORGOT_PASSWORD: '/users/forgot_password',
  VERIFY_RESET_CODE: '/users/verify_change_password_code',
  VERIFY_ACCOUNT: '/users/verify_account',
  RESEND_VERIFY_CODE: '/users/resend_verify_account_code',
  ME: '/users/me',
  /** Đăng nhập Google (web): start → Google → `/callback` → complete (→ verify-email nếu cần). */
  GOOGLE_START: '/users/google/start',
  GOOGLE_COMPLETE: '/users/google/complete',
  GOOGLE_VERIFY_EMAIL: '/users/google/verify-email'
} as const

/** localStorage key under which the (non-sensitive) auth profile is persisted. */
export const AUTH_STORAGE_KEY = 'bmt.auth-state'

export const AUTH_SESSION_REFRESHED_EVENT = 'bmt:session-refreshed'
export const AUTH_SESSION_ENDED_EVENT = 'bmt:session-ended'

/**
 * localStorage key of the fake session profile the mock backend keeps
 * (`NEXT_PUBLIC_USE_MOCK_AUTH=true`).
 *
 * Lives in `shared/` because two feature mocks touch the same record: the auth
 * mock WRITES it on login and READS it on `/me`, while the account mock EDITS
 * it when the profile form is saved — without that, an edit would survive only
 * until the next reload re-fetched `/me`. Delete alongside the mock layer once
 * the .NET API is wired up.
 */
export const MOCK_SESSION_USER_KEY = 'bmt.mock-user'
