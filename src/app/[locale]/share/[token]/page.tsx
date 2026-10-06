import { setRequestLocale } from 'next-intl/server'

import { SharedDossierView } from '@/features/design'
import type { Locale } from '@/i18n/routing'
import { SiteFooter } from '@/shared/layouts'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('share')

interface PageProps {
  params: Promise<{ locale: Locale; token: string }>
}

/** Xem bộ hồ sơ qua link chia sẻ — không cần đăng nhập (mục III.4c). */
export default async function SharePage({ params }: PageProps) {
  const { locale, token } = await params
  setRequestLocale(locale)

  return (
    <div className='flex min-h-svh flex-col'>
      <main className='flex-1'>
        <SharedDossierView token={token} />
      </main>
      <SiteFooter />
    </div>
  )
}
