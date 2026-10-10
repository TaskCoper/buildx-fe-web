import { setRequestLocale } from 'next-intl/server'

import { FooterContentManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Chân trang & Về BuildX: liên hệ, mạng xã hội và nội dung năm trang pháp lý (rich text). */
export default async function AdminFooterContentPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <FooterContentManager />
}
