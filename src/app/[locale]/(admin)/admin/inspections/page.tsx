import { setRequestLocale } from 'next-intl/server'

import { InspectionManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Giám sát thi công — kỹ sư ghi kết quả kiểm tra, giai đoạn khóa lại (R5). */
export default async function AdminInspectionsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <InspectionManager />
}
