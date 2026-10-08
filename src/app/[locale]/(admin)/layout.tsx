import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import type { Locale } from '@/i18n/routing'
import { AdminClientRoot } from './admin-client-root'

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
 * Khu này là CSR: layout chỉ giữ tiêu đề tab và CSS, còn toàn bộ bộ khung (Ant Design, kiểm tra đăng nhập, quyền, menu)
 * nằm trong `AdminApp` và chỉ chạy ở trình duyệt (xem `AdminClientRoot`). Trái với site của khách, nơi trang được dựng sẵn
 * và làm mới theo chu kỳ (ISR).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminClientRoot>{children}</AdminClientRoot>
}
