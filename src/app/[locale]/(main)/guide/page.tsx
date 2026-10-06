import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { GuideView } from './guide-view'

export const generateMetadata = pageMetadata('guide')

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Màn hình 3 — Trang Hướng dẫn (mục II.4). */
export default async function GuidePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <GuideView />
}
