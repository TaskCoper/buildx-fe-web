'use client'

import { usePathname, useRouter } from '@/i18n/navigation'
import { ROUTES } from '@/shared/constants/routes'
import { useEffect, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '../hooks/use-auth'
import { isCustomerRoute } from '../route-access'
import { AuthGuardFallback } from './auth-guard-fallback'
import { RouteForbidden } from './route-forbidden'

interface ProtectedRouteProps {
  children: ReactNode
  /** Rendered while the session is being resolved. */
  fallback?: ReactNode
}

/**
 * Client-side guard for authenticated areas. The middleware is the primary
 * gate; this component handles client navigations and renders a fallback
 * during the brief auth-resolution window to prevent UI flicker.
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, isAuthenticated, isInitialized } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const returnTo = `${pathname}${query ? `?${query}` : ''}`

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      // Login is a popup on the public home, not a page — bounce there and let
      // `?auth=login` auto-open it, preserving the intended target.
      router.replace(`${ROUTES.HOME}?auth=login&redirect=${encodeURIComponent(returnTo)}`)
    }
  }, [isInitialized, isAuthenticated, router, returnTo])

  if (!isInitialized || !isAuthenticated) {
    return <>{fallback ?? <AuthGuardFallback />}</>
  }

  if (user?.mustChangePassword || user?.emailVerified === false) return <AuthGuardFallback />
  if (!user?.accountKind || (isCustomerRoute(pathname) && user.accountKind !== 'Customer')) {
    return <RouteForbidden />
  }

  return <>{children}</>
}
