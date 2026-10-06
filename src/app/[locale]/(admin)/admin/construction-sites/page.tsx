import { setRequestLocale } from 'next-intl/server'

import { ConstructionSiteManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Công trình của khách (STORY-SITE-002) — nhân viên chỉ xem. */
export default async function AdminConstructionSitesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ConstructionSiteManager />
}
