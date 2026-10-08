import { setRequestLocale } from 'next-intl/server'

import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { ADMIN_ROUTES } from '@/shared/constants/routes'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Màn Bản tin Cẩm nang đã gộp vào tab Tin tức của màn Nội dung trang Cẩm nang; giữ đường dẫn cũ để link đã lưu không bị 404. */
export default async function AdminHandbookNewsletterRedirectPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  redirect({ href: ADMIN_ROUTES.HANDBOOK_CONTENT, locale })
}
