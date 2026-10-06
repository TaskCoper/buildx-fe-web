import { setRequestLocale } from 'next-intl/server'

import { CustomerDetail } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale; id: string }>
}

/** Chi tiết tài khoản khách hàng (epic UserAccountManagement §2–§8). */
export default async function AdminCustomersIdPage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  return <CustomerDetail id={id} />
}
