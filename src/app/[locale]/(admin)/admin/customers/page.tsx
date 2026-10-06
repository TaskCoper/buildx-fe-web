import { setRequestLocale } from 'next-intl/server'

import { CustomerManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Người dùng, vai trò và gói đang dùng. */
export default async function AdminCustomersPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <CustomerManager />
}
