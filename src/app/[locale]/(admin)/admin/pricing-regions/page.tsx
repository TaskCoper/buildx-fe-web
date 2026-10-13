import { setRequestLocale } from 'next-intl/server'

import { PricingRegionEditor } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Miền giá theo tỉnh (BR-PROJ-013, TDD-PROJ-008 mục G). */
export default async function AdminPricingRegionsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <PricingRegionEditor />
}
