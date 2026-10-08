import { setRequestLocale } from 'next-intl/server'

import { ContractorsContentManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Nội dung trang Tìm nhà thầu: chữ, ảnh đầu trang và icon của năm khối. */
export default async function AdminContractorsContentPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ContractorsContentManager />
}
