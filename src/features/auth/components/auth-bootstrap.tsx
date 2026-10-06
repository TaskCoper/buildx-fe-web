'use client'

import { Suspense, type ReactNode } from 'react'
import { AuthGuardFallback, RouteGuard } from '@/shared/auth'

import { useCurrentUser } from '../hooks/use-current-user'
import { EmailVerifyDialog } from './email-verify-dialog'
import { MustChangePasswordDialog } from './must-change-password-dialog'

/**
 * Hydrates the auth store from the session cookie by fetching `/me` once. Mount
 * high in authenticated areas (above route guards) so `isInitialized` is
 * resolved before guards decide to redirect.
 *
 * Also hosts the forced first-login password change: it wraps both the public
 * and admin shells, so a staff account with `mustChangePassword` is gated
 * wherever it lands.
 */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  useCurrentUser()
  return (
    <>
      <Suspense fallback={<AuthGuardFallback />}>
        <RouteGuard>{children}</RouteGuard>
      </Suspense>
      <MustChangePasswordDialog />
      <EmailVerifyDialog />
    </>
  )
}
