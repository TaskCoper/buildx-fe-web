import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { ForgotPasswordForm } from '@/features/auth'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth.forgot' })
  return { title: t('title') }
}

export default async function ForgotPasswordPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ForgotPasswordForm />
}
