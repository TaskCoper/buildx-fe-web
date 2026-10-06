'use client'

import { ShieldAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { EmptyState } from '@/shared/components/common'
import { ROLES } from '../auth.constants'
import { RoleGuard } from './role-guard'

/**
 * In-page admin gate. Renders children for staff accounts, otherwise shows a
 * localized "no access" state. Use inside a page already wrapped by
 * `ProtectedRoute` to layer role authorization on top of authentication.
 *
 * `fallback` lets the caller supply a richer refusal screen — the admin layout
 * passes one with a way out, because the default state alone leaves a
 * customer stranded on a blank page with no navigation.
 *
 * UX only — the backend remains the source of truth for authorization.
 */
export function AdminGuard({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const t = useTranslations('auth.forbidden')

  return (
    <RoleGuard
      allow={[ROLES.ADMIN, ROLES.STAFF]}
      fallback={fallback ?? <EmptyState icon={ShieldAlert} title={t('title')} description={t('description')} />}
    >
      {children}
    </RoleGuard>
  )
}
