import { setRequestLocale } from 'next-intl/server'

import { SupervisionPricing } from '@/features/supervision'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { PlanTabs } from '../plan-tabs'

export const generateMetadata = pageMetadata('plansSupervision')

interface PageProps {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ project?: string }>
}

/**
 * S19 — Trang Gói giám sát thi công, tab thứ hai của trang Bảng giá.
 *
 * Nút "Chọn cách quản lý thi công" ở khu dự án link thẳng vào đây kèm
 * `?project=` để đơn hàng gắn đúng dự án (R8) — không popup, không trang riêng.
 */
export default async function SupervisionPlansPage({ params, searchParams }: PageProps) {
  const { locale } = await params
  const { project } = await searchParams
  setRequestLocale(locale)

  return (
    <>
      <PlanTabs active='supervision' />
      <SupervisionPricing projectId={project} />
    </>
  )
}
