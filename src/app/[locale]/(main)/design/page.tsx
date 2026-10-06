import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { DesignEntry } from './design-entry'

export const generateMetadata = pageMetadata('design')

interface PageProps {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ createProject?: string }>
}

/**
 * Điểm vào mục "Thiết kế & Dự toán" trên thanh công cụ.
 * Chưa có dự án nào đang mở → mở Cửa sổ Tạo dự án (mục III.1).
 */
export default async function DesignPage({ params, searchParams }: PageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <DesignEntry openCreateProject={query.createProject === '1'} />
    </ProtectedRoute>
  )
}
