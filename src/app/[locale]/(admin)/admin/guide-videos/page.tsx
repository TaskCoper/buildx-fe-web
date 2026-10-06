import { setRequestLocale } from 'next-intl/server'

import { GuideVideoManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Video hướng dẫn — thêm, sửa, xóa và chọn video nổi bật của trang Hướng dẫn. */
export default async function AdminGuideVideosPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <GuideVideoManager />
}
