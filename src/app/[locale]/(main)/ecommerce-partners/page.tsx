import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { LegalPage } from '@/features/landing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'legal.ecommerce' })
  return { title: t('title') }
}

export default async function EcommercePartnersPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <LegalPage doc='ecommerce' />
}
