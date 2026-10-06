import { setRequestLocale } from 'next-intl/server'

import { DiscountManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Mã giảm giá của ô nhập mã ở màn xác nhận đơn (S03). */
export default async function AdminDiscountsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <DiscountManager />
}
