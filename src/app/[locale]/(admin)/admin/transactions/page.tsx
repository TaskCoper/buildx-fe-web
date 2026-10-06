import { setRequestLocale } from 'next-intl/server'

import { TransactionManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Sổ giao dịch thanh toán — chỉ đọc, tìm và lọc. */
export default async function AdminTransactionsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <TransactionManager />
}
