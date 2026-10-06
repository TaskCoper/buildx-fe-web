import { setRequestLocale } from 'next-intl/server'

import { SupervisionPackageManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Giá, thời hạn và số lượt kiểm tra của ba gói giám sát (S19). */
export default async function AdminSupervisionPackagesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <SupervisionPackageManager />
}
