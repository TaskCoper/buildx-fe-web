import { setRequestLocale } from 'next-intl/server'

import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ADMIN_ROUTES } from '@/shared/constants/routes'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Đã gộp Mẫu 2D + 3D vào "Thư viện mẫu" — chuyển hướng để giữ link cũ. */
export default async function AdminTemplates3dPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  redirect({ href: ADMIN_ROUTES.TEMPLATES, locale })
}
