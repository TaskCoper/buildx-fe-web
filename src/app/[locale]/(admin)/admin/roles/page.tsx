import { setRequestLocale } from 'next-intl/server'

import { RoleManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Vai trò và quyền (STORY-RBAC-001) */
export default async function AdminPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <RoleManager />
}
