import { setRequestLocale } from 'next-intl/server'

import { StyleManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Phong cách kiến trúc & nội thất — một màn, chọn nhóm bằng Segmented. */
export default async function AdminStylesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <StyleManager />
}
