import { setRequestLocale } from 'next-intl/server'

import { InvitationManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Lời mời báo giá — vận hành đẩy 4 nấc trạng thái khách xem ở S18 (R4). */
export default async function AdminInvitationsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <InvitationManager />
}
