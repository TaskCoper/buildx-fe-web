import { setRequestLocale } from 'next-intl/server'

import { SitesScreen } from '@/features/site'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: string }>
}

/** Công trình của tôi (STORY-SITE-001) + gán gói giám sát (STORY-SUB-004). */
export default async function AccountSitesPage({ params }: PageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  setRequestLocale(locale)

  return <SitesScreen />
}
