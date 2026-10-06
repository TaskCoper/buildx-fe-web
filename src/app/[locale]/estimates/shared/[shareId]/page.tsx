import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { SiteFooter } from '@/shared/layouts'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { SharedEstimateView } from './shared-estimate-view'

export const generateMetadata = pageMetadata('share')

interface PageProps {
  params: Promise<{ locale: Locale; shareId: string }>
}

/** Xem hồ sơ dự toán qua link chia sẻ của BE — không cần đăng nhập. Token nằm ở fragment (`#token=…`). */
export default async function SharedEstimatePage({ params }: PageProps) {
  const { locale, shareId } = await params
  setRequestLocale(locale)

  return (
    <div className='flex min-h-svh flex-col'>
      <main className='flex-1'>
        <SharedEstimateView shareId={shareId} />
      </main>
      <SiteFooter />
    </div>
  )
}
