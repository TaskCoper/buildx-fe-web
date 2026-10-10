import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { PurchasesView } from './purchases-view'

export const generateMetadata = pageMetadata('accountPurchases')

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AccountPurchasesPage({ params }: PageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  setRequestLocale(locale)

  return <PurchasesView />
}
