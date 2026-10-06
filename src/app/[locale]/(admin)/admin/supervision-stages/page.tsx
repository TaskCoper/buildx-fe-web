import { setRequestLocale } from 'next-intl/server'

import { SupervisionStageManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Giai đoạn giám sát (spec admin #15). */
export default async function AdminSupervisionStagesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <SupervisionStageManager />
}
