import { setRequestLocale } from 'next-intl/server'

import { ConsultantManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Kiến trúc sư tư vấn 1:1 (epic ArchitectManagement). */
export default async function AdminConsultantsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ConsultantManager />
}
