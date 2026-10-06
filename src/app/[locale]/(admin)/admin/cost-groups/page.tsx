import { setRequestLocale } from 'next-intl/server'

import { CostGroupManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Nhóm chi phí (spec admin #3). */
export default async function AdminCostGroupsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <CostGroupManager />
}
