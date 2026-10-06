import { setRequestLocale } from 'next-intl/server'

import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ADMIN_ROUTES } from '@/shared/constants'

interface PageProps {
  params: Promise<{ locale: Locale; id: string }>
}

/**
 * Màn quản lý nhà thầu mới sửa hồ sơ ngay trong ngăn kéo (drawer) nên không còn
 * trang chi tiết riêng — chuyển hướng về danh sách. Giữ route để link cũ không 404.
 */
export default async function AdminContractorsIdPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  redirect({ href: ADMIN_ROUTES.CONTRACTORS, locale })
}
