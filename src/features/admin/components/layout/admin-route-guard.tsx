'use client'

import { Button, Result } from 'antd'
import { useTranslations } from 'next-intl'
import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from '@/i18n/navigation'
import { AuthGuardFallback, canAccessAdminRoute, useAuth } from '@/shared/auth'
import { ROUTES } from '@/shared/constants'
import { ADMIN_NAV_ITEMS } from './admin-nav.config'

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const { user, isInitialized } = useAuth()
  const pathname = usePathname()
  if (!isInitialized) return <AuthGuardFallback />
  return canAccessAdminRoute(user, pathname) ? <>{children}</> : <AdminSectionForbidden />
}

function AdminSectionForbidden() {
  const t = useTranslations('auth.forbidden')
  const { user } = useAuth()
  const router = useRouter()
  const firstAllowed = ADMIN_NAV_ITEMS.find((item) => canAccessAdminRoute(user, item.href))?.href
  return (
    <Result
      status='403'
      title={t('title')}
      subTitle={t(firstAllowed ? 'sectionDescription' : 'noSections')}
      extra={
        <Button type='primary' onClick={() => router.replace(firstAllowed ?? ROUTES.HOME)}>
          {t(firstAllowed ? 'allowedSection' : 'backHome')}
        </Button>
      }
    />
  )
}

/** /admin always chooses the first visible section the current session may access. */
export function AdminLanding() {
  const { user, isInitialized } = useAuth()
  const router = useRouter()
  const target = ADMIN_NAV_ITEMS.find((item) => canAccessAdminRoute(user, item.href))?.href
  useEffect(() => {
    if (isInitialized && target) router.replace(target)
  }, [isInitialized, target, router])
  if (!isInitialized || target) return <AuthGuardFallback />
  return <AdminSectionForbidden />
}
