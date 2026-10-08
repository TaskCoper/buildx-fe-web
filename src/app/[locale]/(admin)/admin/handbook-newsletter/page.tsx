import { setRequestLocale } from 'next-intl/server'

import { HandbookNewsletterManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Khối Bản tin của trang Cẩm nang (STORY-HB-003). */
export default async function AdminHandbookNewsletterPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HandbookNewsletterManager />
}
