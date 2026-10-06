import { setRequestLocale } from 'next-intl/server'

import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { ArticleView } from './article-view'

export const generateMetadata = pageMetadata('handbookArticle')

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>
}

/** Trang bài viết trong Cẩm nang / Tin tức (Phần 3.3). */
export default async function HandbookArticlePage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  return <ArticleView slug={slug} />
}
