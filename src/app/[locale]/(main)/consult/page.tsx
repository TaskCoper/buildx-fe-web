import { setRequestLocale } from 'next-intl/server'

import { ConsultantDirectory } from '@/features/consultation'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('consult')

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Trang Tư vấn 1:1 — danh sách kiến trúc sư (mục VIII.1, Hình 14). */
export default async function ConsultPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ConsultantDirectory />
}
