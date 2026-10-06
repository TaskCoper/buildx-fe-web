import { setRequestLocale } from 'next-intl/server'

import { ConstructionScopeManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Danh mục phạm vi thi công (STORY-CTR-003) — dùng cho hồ sơ & dự án nhà thầu. */
export default async function AdminConstructionScopesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ConstructionScopeManager />
}
