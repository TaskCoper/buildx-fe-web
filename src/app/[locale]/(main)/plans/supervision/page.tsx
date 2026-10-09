import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { SupervisionPricing } from '@/features/supervision'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { PlanTabs } from '../plan-tabs'
import { SupervisionPricingWithProject } from './supervision-pricing-with-project'

export const generateMetadata = pageMetadata('plansSupervision')

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/**
 * S19 — Trang Gói giám sát thi công, tab thứ hai của trang Bảng giá.
 *
 * Nút "Chọn cách quản lý thi công" ở khu dự án link thẳng vào đây kèm
 * `?project=` để đơn hàng gắn đúng dự án (R8) — không popup, không trang riêng.
 *
 * `?project=` đọc ở client (`SupervisionPricingWithProject`), không phải `searchParams` của server, để trang vẫn
 * ISR được. Bảng giá là nội dung công khai nên bản dựng sẵn (không có `project`) nằm làm `fallback` của Suspense: khách
 * và công cụ tìm kiếm thấy đủ bảng giá ngay trong HTML, rồi client thay bằng bản có dự án.
 */
export default async function SupervisionPlansPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <PlanTabs active='supervision' />
      <Suspense fallback={<SupervisionPricing />}>
        <SupervisionPricingWithProject />
      </Suspense>
    </>
  )
}
