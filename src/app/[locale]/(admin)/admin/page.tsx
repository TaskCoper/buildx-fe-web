import { setRequestLocale } from 'next-intl/server'

import { AdminLanding } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Hidden overview route chooses the first sidebar section allowed for the current session. */
export default async function AdminHomePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  return <AdminLanding />
}
