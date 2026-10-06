import { setRequestLocale } from 'next-intl/server'

import { StaffManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Tài khoản nhân viên (STORY-RBAC-002) */
export default async function AdminPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <StaffManager />
}
