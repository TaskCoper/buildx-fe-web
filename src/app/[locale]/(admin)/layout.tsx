import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import type { Locale } from '@/i18n/routing'
import { AdminApp } from './admin-app'

import './admin.css'

/**
 * Tab khu quản trị hiện "Quản trị | BuildX". Không đặt thì các trang admin rơi về tiêu đề SEO mặc
 * định của site ("NỀN TẢNG AI HỖ TRỢ LẬP KẾ HOẠCH…") — sai ngữ cảnh với người vận hành.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'admin.shell' })
  return { title: t('title'), robots: { index: false, follow: false } }
}

/**
 * Khung khu quản trị — route group `(admin)` nên URL vẫn là `/admin/...`.
 *
 * Dữ liệu và quyền được kiểm tra ở client. Import trực tiếp để Next tải mã
 * khung admin cùng lúc với kiểm tra phiên, tránh chờ /users/me rồi mới tải
 * thêm một module qua dynamic ssr:false. AuthBootstrap vẫn trả loading trong
 * HTML ban đầu; không đưa hồ sơ hay dữ liệu quản trị vào cache của server.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminApp>{children}</AdminApp>
}
