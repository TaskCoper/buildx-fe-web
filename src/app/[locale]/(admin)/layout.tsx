import type { ReactNode } from 'react'

import { AdminRouteGuard, AdminShell } from '@/features/admin'
import { AdminGuard, ProtectedRoute } from '@/shared/auth'
import { AntdProvider } from '@/shared/providers'
import { AdminAccount } from './admin-account'
import { AdminForbidden } from './admin-forbidden'

import './admin.css'

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
