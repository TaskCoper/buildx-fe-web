import { setRequestLocale } from 'next-intl/server'

import { ConsultationAccountPanel } from '@/features/consultation'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('accountConsultations')

interface PageProps {
  params: Promise<{ locale: string }>
}

// Lịch tư vấn của khách: API thật đọc `GET /me/consultation-requests` (chỉ xem, BR-CONSULT-006); chế độ mock giữ
// màn lịch sử cũ. Xem `ConsultationAccountPanel` của `features/consultation`.
export default async function AccountConsultationsPage({ params }: PageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  setRequestLocale(locale)

  return <ConsultationAccountPanel />
}
