import { setRequestLocale } from 'next-intl/server'

import { TestimonialManager } from '@/features/admin'
import type { Locale } from '@/i18n/routing'

interface PageProps {
  params: Promise<{ locale: Locale }>
}

/** Nhận xét khách hàng ở trang chủ — ảnh đại diện + nội dung. */
export default async function AdminTestimonialsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return <TestimonialManager />
}
