import { setRequestLocale } from 'next-intl/server'

import { AccessAuditManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Nhật ký thay đổi quyền (STORY-RBAC-004) — chỉ đọc. */
export default async function AdminAccessAuditPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <AccessAuditManager />
}
