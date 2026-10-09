import { setRequestLocale } from 'next-intl/server'
import { ConsultationContentManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

export default async function PlansContentPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <ConsultationContentManager />
}
