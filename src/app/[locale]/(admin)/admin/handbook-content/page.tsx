import { setRequestLocale } from 'next-intl/server'

import { HandbookContentManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Chữ cố định của trang Cẩm nang (STORY-HB-004). */
export default async function AdminHandbookContentPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HandbookContentManager />
}
