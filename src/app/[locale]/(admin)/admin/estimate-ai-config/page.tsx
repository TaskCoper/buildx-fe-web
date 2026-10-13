import { setRequestLocale } from 'next-intl/server'

import { AiConfigEditor } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Cấu hình AI của luồng tạo dự toán (STORY-PROJ-012, TDD-PROJ-008). */
export default async function AdminEstimateAiConfigPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <AiConfigEditor />
}
