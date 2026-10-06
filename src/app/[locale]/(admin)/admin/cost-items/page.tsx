import { setRequestLocale } from 'next-intl/server'

import { CostItemManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Hạng mục và hạng mục con (spec admin #3). */
export default async function AdminCostItemsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <CostItemManager />
}
