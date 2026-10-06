import { setRequestLocale } from 'next-intl/server'

import { GiftManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Danh mục quà tặng (epic GiftManagement). */
export default async function AdminGiftsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <GiftManager />
}
