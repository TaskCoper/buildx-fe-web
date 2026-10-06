export {
  ALL_ROLES,
  AUTH_COOKIE_NAME,
  AUTH_ENDPOINTS,
  AUTH_STORAGE_KEY,
  AUTH_SESSION_REFRESHED_EVENT,
  AUTH_SESSION_ENDED_EVENT,
  MOCK_SESSION_USER_KEY,
  ROLES,
  type Role
} from './auth.constants'
export { useAuthStore } from './auth.store'
export { clearSessionMarker, hasSessionMarker, setSessionMarker } from './session-marker'
export { useAuthDialogStore, type AuthDialogMode } from './auth-dialog.store'
export type { AuthActions, AuthState, AuthStore, AuthUser } from './auth.types'
export { AdminGuard } from './guards/admin-guard'
export { GuestRoute } from './guards/guest-route'
export { ProtectedRoute } from './guards/protected-route'
export { RoleGuard } from './guards/role-guard'
export { useAuth } from './hooks/use-auth'
export { PERMISSIONS, type PermissionCode } from './permissions'
export {
  ADMIN_ROUTE_ACCESS,
  authHome,
  canAccessAdminRoute,
  hasPermission,
  isCustomerRoute,
  isProtectedPath,
  loginDestination,
  matchesRoute
} from './route-access'
export { RouteGuard } from './guards/route-guard'
export { AuthGuardFallback } from './guards/auth-guard-fallback'
