import { setRequestLocale } from 'next-intl/server'

import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ADMIN_ROUTES } from '@/shared/constants/routes'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Đã gộp phong cách KT + NT vào "Phong cách" — chuyển hướng để giữ link cũ. */
export default async function AdminArchitectureStylesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  redirect({ href: ADMIN_ROUTES.STYLES, locale })
}
