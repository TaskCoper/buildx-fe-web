import { setRequestLocale } from 'next-intl/server'

import { EstimatePipelineInspector } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Chi tiết luồng AI của một bản dự toán (STORY-PROJ-012 ALT-01–03). */
export default async function AdminEstimatePipelinePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <EstimatePipelineInspector />
}
