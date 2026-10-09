import type { Metadata } from 'next'

import type { Locale } from '@/i18n/routing'
import { LegalRoute, legalMetadata } from '../legal-route'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  return legalMetadata(locale, 'payment')
}

export default async function PaymentPolicyPage({ params }: PageProps) {
  const { locale } = await params

  return <LegalRoute locale={locale} doc='payment' />
}
