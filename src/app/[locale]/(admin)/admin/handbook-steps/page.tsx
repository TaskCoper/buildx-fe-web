import { setRequestLocale } from 'next-intl/server'

import { HandbookStepManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Các bước trong Cẩm nang (spec admin #2). */
export default async function AdminHandbookStepsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <HandbookStepManager />
}
