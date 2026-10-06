import { setRequestLocale } from 'next-intl/server'

import { BuildingTypeManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Loại công trình & cấu hình quy mô (epic ConstructionTypeManagement). */
export default async function AdminBuildingTypesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <BuildingTypeManager />
}
