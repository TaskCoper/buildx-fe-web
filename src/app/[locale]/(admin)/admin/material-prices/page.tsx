import { setRequestLocale } from 'next-intl/server'

import { MaterialPriceManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Giá vật tư theo khu vực (spec admin #3). */
export default async function AdminMaterialPricesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <MaterialPriceManager />
}
