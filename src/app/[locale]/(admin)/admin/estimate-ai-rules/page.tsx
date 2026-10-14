import { setRequestLocale } from 'next-intl/server'
import { AiRuleEditor } from '@/features/admin'
import type { Locale } from '@/i18n/routing'
export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <AiRuleEditor />
}
