import { redirect } from '@/i18n/navigation'
import { ADMIN_ROUTES } from '@/shared/constants'
import type { Locale } from '@/i18n/routing'
export default async function SupervisionContentPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  redirect({ href: `${ADMIN_ROUTES.PLANS_CONTENT}?tab=supervision`, locale })
}
