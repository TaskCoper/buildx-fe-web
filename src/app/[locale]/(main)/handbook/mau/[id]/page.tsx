import { setRequestLocale } from 'next-intl/server'

import { TemplateDetail } from '@/features/handbook'
import type { Locale } from '@/i18n/routing'
import { pageMetadata } from '@/shared/lib/page-metadata'

export const generateMetadata = pageMetadata('handbookTemplate')

/**
 * ISR theo yêu cầu: không dựng sẵn trang nào lúc build; trang đầu tiên khách mở được dựng rồi lưu đệm và làm mới nền.
 * Nội dung theo người dùng nằm ở client nên mọi mã trong đường dẫn dùng chung một khung trang.
 */
export function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ locale: Locale; id: string }>
}

/** Trang chi tiết mẫu bản vẽ 2D / mẫu nội thất 3D (Phần 2.3 và 2.4). */
export default async function HandbookTemplatePage({ params }: PageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  return <TemplateDetail templateId={id} />
}
