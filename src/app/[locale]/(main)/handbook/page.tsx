import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'

import { HandbookBrowser } from '@/features/handbook'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('handbook')

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Màn hình 2 — Trang Cẩm nang (mục II.3). */
export default async function HandbookPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  // `HandbookBrowser` đọc tab đang mở từ `useSearchParams`, nên nó cần ranh giới
  // Suspense của riêng mình để trang vẫn dựng tĩnh được.
  return (
    <Suspense>
      <HandbookBrowser />
    </Suspense>
  )
}
