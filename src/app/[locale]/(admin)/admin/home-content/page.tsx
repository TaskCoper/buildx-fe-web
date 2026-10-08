import { setRequestLocale } from 'next-intl/server'

import { HomeContentManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Nội dung trang chủ: chữ, ảnh, icon, mẫu và video nổi bật của 11 khối. */
export default async function AdminHomeContentPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HomeContentManager />
}
