import { setRequestLocale } from 'next-intl/server'

import { EstimateAdviceEditor } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Nội dung tư vấn SAVICO (spec admin #3). */
export default async function AdminEstimateAdvicePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <EstimateAdviceEditor />
}
