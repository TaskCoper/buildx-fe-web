import { setRequestLocale } from 'next-intl/server'

import { resolveCurrentArticleSlug } from '@/features/handbook'
import { permanentRedirect } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { handbookArticleRoute } from '@/shared/constants/routes'
import { pageMetadata } from '@/shared/lib/page-metadata'
import { ArticleView } from './article-view'

export const generateMetadata = pageMetadata('handbookArticle')

/**
 * ISR theo yêu cầu: không dựng sẵn trang nào lúc build; trang đầu tiên khách mở được dựng rồi lưu đệm và làm mới nền.
 * Nội dung theo người dùng nằm ở client nên mọi mã trong đường dẫn dùng chung một khung trang.
 */
export function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>
}

/**
 * Trang bài viết trong Cẩm nang / Tin tức (Phần 3.3).
 *
 * Mở bằng đường dẫn cũ hoặc định danh thì chuyển hướng VĨNH VIỄN sang đường dẫn hiện tại (BR-NEWS-004 khoản 6):
 * hai đường dẫn cùng nội dung bị công cụ tìm kiếm coi là trùng lặp và chia nhỏ thứ hạng của chính bài đó. Backend
 * chỉ trả 200 kèm `slug` hiện tại nên việc so sánh và phát chuyển hướng nằm ở đây.
 */
export default async function HandbookArticlePage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const current = await resolveCurrentArticleSlug(slug)
  if (current && current !== slug) {
    permanentRedirect({ href: handbookArticleRoute(current), locale })
  }

  return <ArticleView slug={slug} />
}
