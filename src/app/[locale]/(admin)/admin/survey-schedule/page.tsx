import { setRequestLocale } from 'next-intl/server'

import { SurveyScheduleManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Lịch khảo sát nhà thầu (spec admin #13). */
export default async function AdminSurveySchedulePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <SurveyScheduleManager />
}
