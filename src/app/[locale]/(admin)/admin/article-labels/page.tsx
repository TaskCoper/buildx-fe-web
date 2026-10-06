import { setRequestLocale } from 'next-intl/server'

import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ADMIN_ROUTES } from '@/shared/constants/routes'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Danh mục tin tức giờ sửa bằng nút "Quản lý danh mục" trên màn Bài viết. */
export default async function AdminArticleLabelsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  redirect({ href: ADMIN_ROUTES.ARTICLES, locale })
}
