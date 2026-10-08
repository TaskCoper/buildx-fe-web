import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { CONTRACTORS_PAGE_KEY } from '@/shared/cms/contractors-sections'
import { HomeContentProvider } from '@/shared/cms/home-content'
import { fetchPageContent } from '@/shared/cms/home-content.server'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { ContractorLandingClient } from './contractor-landing-client'

export const generateMetadata = pageMetadata('contractors')

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/**
 * S09 — Landing "Tìm nhà thầu" (trang công khai).
 *
 * Chữ, ảnh đầu trang và icon của các khối do admin biên tập (trang `contractors` của backend) được lấy ở server rồi đưa
 * xuống qua cùng ngữ cảnh khối chữ của trang chủ, để HTML đầu tiên đã đúng nội dung mới. Backend không trả được thì
 * trang dùng nội dung có sẵn trong ứng dụng.
 */
export default async function ContractorsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const { sections, iconNodes } = await fetchPageContent(CONTRACTORS_PAGE_KEY, locale)

  return (
    <HomeContentProvider sections={sections} iconNodes={iconNodes}>
      <ContractorLandingClient />
    </HomeContentProvider>
  )
}
