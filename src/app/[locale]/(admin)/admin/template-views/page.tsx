import { setRequestLocale } from 'next-intl/server'

import { QuotaEditor } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Lượt đọc chi tiết mẫu mỗi ngày (epic TemplateViewManagement). */
export default async function AdminTemplateViewsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <QuotaEditor />
}
