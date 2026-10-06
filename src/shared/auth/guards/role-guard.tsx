'use client'

import type { ReactNode } from 'react'
import type { Role } from '../auth.constants'
import { useAuth } from '../hooks/use-auth'

interface RoleGuardProps {
  /** Roles permitted to view the children. */
  allow: readonly Role[]
  children: ReactNode
  /** Rendered when the user lacks every allowed role. Defaults to nothing. */
  fallback?: ReactNode
}

/**
 * Conditionally renders children based on the current user's roles.
 * Use for in-page authorization (e.g. admin-only buttons or sections).
 *
 * NOTE: This is a UX convenience only. Real authorization MUST be enforced
 * by the .NET backend on every request.
 */
export function RoleGuard({ allow, children, fallback = null }: RoleGuardProps) {
  const { hasAnyRole } = useAuth()
  return <>{hasAnyRole(allow) ? children : fallback}</>
}
