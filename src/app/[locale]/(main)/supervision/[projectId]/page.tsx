import { setRequestLocale } from 'next-intl/server'

import { SupervisionDashboard } from '@/features/supervision'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('supervision')

interface PageProps {
  params: Promise<{ locale: Locale; projectId: string }>
  searchParams: Promise<{ stage?: string }>
}

/**
 * S20–S23 — Bảng điều khiển giám sát.
 *
 * MỘT trang, bốn trạng thái giai đoạn. `?stage=` chọn giai đoạn đang mở nên
 * banner "Đến giai đoạn 4" và thẻ ở cột trái đều là link chia sẻ được.
 */
export default async function SupervisionPage({ params, searchParams }: PageProps) {
  const { locale, projectId } = await params
  const { stage } = await searchParams
  setRequestLocale(locale)

  const parsed = Number(stage)
  const stageIndex = Number.isInteger(parsed) && parsed >= 1 && parsed <= 6 ? parsed : undefined

  return (
    <ProtectedRoute>
      <SupervisionDashboard projectId={projectId} stageIndex={stageIndex} />
    </ProtectedRoute>
  )
}
