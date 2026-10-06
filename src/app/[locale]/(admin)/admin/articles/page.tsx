import { setRequestLocale } from 'next-intl/server'

import { ArticleManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Bài viết Cẩm nang (spec admin #2). */
export default async function AdminArticlesPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ArticleManager />
}
