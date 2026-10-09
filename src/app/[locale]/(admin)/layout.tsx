import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'

import { AdminRouteGuard, AdminShell } from '@/features/admin'
import type { Locale } from '@/i18n/routing'
import { AdminGuard, ProtectedRoute } from '@/shared/auth'
import { AntdProvider } from '@/shared/providers'
import { AdminAccount } from './admin-account'
import { AdminForbidden } from './admin-forbidden'

import './admin.css'

/**
 * Tab khu quản trị hiện "Quản trị | BuildX". Không đặt thì các trang admin rơi về tiêu đề SEO mặc
 * định của site ("NỀN TẢNG AI HỖ TRỢ LẬP KẾ HOẠCH…") — sai ngữ cảnh với người vận hành.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale: locale as Locale, namespace: 'admin.shell' })
  return { title: t('title') }
}

/**
 * Khung khu quản trị — route group `(admin)` nên URL vẫn là `/admin/...`.
 *
 * Ba lớp bọc, từ ngoài vào:
 *   1. `AntdProvider` — chỉ nhánh này nạp Ant Design, site công khai không dính.
 *   2. `ProtectedRoute` — chưa đăng nhập thì bật popup đăng nhập ở trang chủ.
 *   3. `AdminGuard`   — đăng nhập rồi nhưng không phải admin thì hiện màn "không
 *      có quyền" KÈM đường quay ra, thay vì nội dung. Cả hai lớp guard là UX;
 *      backend .NET mới là nơi phân quyền thật sự.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AntdProvider>
      <ProtectedRoute>
        <AdminGuard fallback={<AdminForbidden />}>
          <AdminShell userSlot={<AdminAccount />}>
            <AdminRouteGuard>{children}</AdminRouteGuard>
          </AdminShell>
        </AdminGuard>
      </ProtectedRoute>
    </AntdProvider>
  )
}
