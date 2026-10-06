import { setRequestLocale } from 'next-intl/server'

import { LibraryTemplateManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Thư viện mẫu 2D & 3D — một màn, lọc 2D/3D bằng Segmented. */
export default async function AdminTemplatesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <LibraryTemplateManager />
}
