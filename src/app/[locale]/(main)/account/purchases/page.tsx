import { setRequestLocale } from 'next-intl/server'

import { PurchaseHistory } from '@/features/account'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('accountPurchases')

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AccountPurchasesPage({ params }: PageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  setRequestLocale(locale)

  return <PurchaseHistory />
}
