import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { AccountPending } from '../account-pending'

export const generateMetadata = pageMetadata('accountDossiers')

interface PageProps {
  params: Promise<{ locale: string }>
}

// Hồ sơ thi công (luồng nhà thầu) CHƯA có API nào trên BE — hiện trạng thái "đang
// phát triển" thay cho dữ liệu mock. Khi BE có API, thay lại bằng
// `<AccountDossierList />` của `features/contractors`.
export default async function AccountDossiersPage({ params }: PageProps) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  setRequestLocale(locale)

  return <AccountPending />
}
