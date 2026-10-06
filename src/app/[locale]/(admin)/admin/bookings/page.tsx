import { setRequestLocale } from 'next-intl/server'

import { BookingManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Lịch hẹn tư vấn khách đặt trên site (mục VIII.3). */
export default async function AdminBookingsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <BookingManager />
}
