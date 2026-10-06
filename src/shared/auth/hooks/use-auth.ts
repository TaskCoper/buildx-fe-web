'use client'

import { useMemo } from 'react'
import type { Role } from '../auth.constants'
import { useAuthStore } from '../auth.store'
import { hasPermission } from '../route-access'
import type { PermissionCode } from '../permissions'

/**
 * Ergonomic read-only view over the auth store plus role helpers.
 * Prefer this in components over reaching into the store directly.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  return useMemo(() => {
    const roles = user?.roles ?? []
    const ready = isInitialized && isAuthenticated
    return {
      user,
      roles,
      isAuthenticated,
      isInitialized,
      isCustomer: ready && user?.accountKind === 'Customer' && !user.mustChangePassword && user.emailVerified !== false,
      isStaff: ready && user?.accountKind === 'Staff',
      hasRole: (role: Role) => ready && roles.includes(role),
      hasAnyRole: (allowed: readonly Role[]) => ready && allowed.some((r) => roles.includes(r)),
      hasPermission: (code: PermissionCode) => ready && hasPermission(user, code),
      hasAnyPermission: (codes: readonly PermissionCode[]) => ready && codes.some((code) => hasPermission(user, code)),
      hasAllPermissions: (codes: readonly PermissionCode[]) => ready && codes.every((code) => hasPermission(user, code))
    }
  }, [user, isAuthenticated, isInitialized])
}
