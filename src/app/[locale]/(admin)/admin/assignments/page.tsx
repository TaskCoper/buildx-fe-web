import { setRequestLocale } from 'next-intl/server'

import { AssignmentManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Phân công gói giám sát (STORY-RBAC-003) */
export default async function AdminPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <AssignmentManager />
}
