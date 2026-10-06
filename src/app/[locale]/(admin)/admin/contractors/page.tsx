import { setRequestLocale } from 'next-intl/server'

import { ContractorAdminManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Quản lý nhà thầu (STORY-CTR-001) — CRUD hồ sơ + ẩn/hiện, nối BMT API. */
export default async function AdminContractorsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ContractorAdminManager />
}
