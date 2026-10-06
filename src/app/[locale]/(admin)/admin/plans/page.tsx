import { setRequestLocale } from 'next-intl/server'

import { PlanManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Bảng giá ba gói — cấu hình hệ thống, không phải chữ trên trang. */
export default async function AdminPlanTablePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <PlanManager />
}
