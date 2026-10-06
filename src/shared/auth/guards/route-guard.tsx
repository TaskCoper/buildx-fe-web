'use client'

import type { ReactNode } from 'react'
import { usePathname } from '@/i18n/navigation'
import { GUEST_ONLY_ROUTES } from '@/shared/constants/routes'
import { isProtectedPath, matchesRoute } from '../route-access'
import { GuestRoute } from './guest-route'
import { ProtectedRoute } from './protected-route'

/** Central gate also covers client navigation and newly added children of private routes. */
export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (isProtectedPath(pathname)) return <ProtectedRoute>{children}</ProtectedRoute>
  if (GUEST_ONLY_ROUTES.some((route) => matchesRoute(pathname, route))) return <GuestRoute>{children}</GuestRoute>
  return <>{children}</>
}
