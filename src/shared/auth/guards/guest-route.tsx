'use client'

import { useRouter } from '@/i18n/navigation'
import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../hooks/use-auth'
import { AuthGuardFallback } from './auth-guard-fallback'
import { authHome } from '../route-access'

interface GuestRouteProps {
  children: ReactNode
  /** Where to send already-authenticated users. Defaults to the home page. */
  redirectTo?: string
  fallback?: ReactNode
}

/**
 * Guard for guest-only pages (login, register…).
 *
 * Waits for the session check before rendering a guest form or redirecting to
 * the account's landing page, including during client navigation.
 */
export function GuestRoute({ children, redirectTo, fallback }: GuestRouteProps) {
  const { user, isAuthenticated, isInitialized } = useAuth()
  const router = useRouter()

  const shouldRedirect = isInitialized && isAuthenticated
  const destination = redirectTo ?? (user ? authHome(user) : '/')

  useEffect(() => {
    if (shouldRedirect) {
      router.replace(destination)
    }
  }, [shouldRedirect, router, destination])

  if (!isInitialized || shouldRedirect) {
    return <>{fallback ?? <AuthGuardFallback />}</>
  }

  return <>{children}</>
}
