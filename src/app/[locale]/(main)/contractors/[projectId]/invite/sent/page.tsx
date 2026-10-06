import { setRequestLocale } from 'next-intl/server'

import { InviteSent } from '@/features/contractors'
import type { Locale } from '@/i18n/routing'
import { ProtectedRoute } from '@/shared/auth'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('contractorSent')

interface PageProps {
  params: Promise<{ locale: Locale; projectId: string }>
  searchParams: Promise<{ request?: string }>
}

/** S17 — Đã gửi lời mời & đăng ký khảo sát. */
export default async function ContractorInviteSentPage({ params, searchParams }: PageProps) {
  const { locale, projectId } = await params
  const { request } = await searchParams
  setRequestLocale(locale)

  return (
    <ProtectedRoute>
      <InviteSent projectId={projectId} requestId={request ?? ''} />
    </ProtectedRoute>
  )
}
