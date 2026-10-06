import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { AccountPending } from '../account-pending'

export const generateMetadata = pageMetadata('accountConsultations')

interface PageProps {
  params: Promise<{ locale: string }>
}

// Lịch tư vấn của khách CHƯA có API (`GET /me/consultation-requests` chưa có) —
// hiện trạng thái "đang phát triển" thay cho dữ liệu mock. Khi BE có API, thay
// lại bằng `<ConsultationHistory />` của `features/consultation`.
export default async function AccountConsultationsPage({ params }: PageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  setRequestLocale(locale)

  return <AccountPending />
}
