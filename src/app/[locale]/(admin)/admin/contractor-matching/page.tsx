import { setRequestLocale } from 'next-intl/server'

import { ContractorMatchingEditor } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Quy tắc đề xuất nhà thầu (spec admin #12). */
export default async function AdminContractorMatchingPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ContractorMatchingEditor />
}
