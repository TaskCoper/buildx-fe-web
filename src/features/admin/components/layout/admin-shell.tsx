'use client'

import { Drawer, Grid, Layout } from 'antd'
import { useState, type ReactNode } from 'react'

import { usePathname } from '@/i18n/navigation'
import { AdminHeader } from './admin-header'
import { AdminMenu } from './admin-menu'
import { AdminBrand } from './admin-brand'

const { Content, Sider } = Layout

/**
 * Khung khu quản trị: menu trái + thanh trên dính + vùng nội dung.
 *
 * Tách hẳn khỏi khung site công khai (`(main)/layout.tsx`) theo đúng cách route
 * group hoạt động — khu quản trị không có header/footer/chatbox của khách, và
 * Ant Design chỉ nạp trong nhánh này.
 *
 * MÀN HẸP: `Sider` thu gọn chỉ còn dải icon 80px — trên điện thoại dải đó ăn
 * gần một phần tư bề ngang mà vẫn không đọc được nhãn. Dưới `lg` bỏ hẳn Sider,
 * menu chuyển sang `Drawer` phủ lên và tự đóng khi đổi trang.
 */
export function AdminShell({ children, userSlot }: { children: ReactNode; userSlot?: ReactNode }) {
  const screens = Grid.useBreakpoint()
  const pathname = usePathname()

  const [collapsed, setCollapsed] = useState(false)

  // Ngăn kéo nhớ MỞ Ở TRANG NÀO chứ không giữ một cờ bật/tắt. Nhờ vậy đổi trang
  // là nó tự đóng — suy ra lúc render, không cần effect chạy sau mỗi lần điều hướng.
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const drawerOpen = openedAt === pathname

  // `screens.lg` là `undefined` ở lần render đầu (chưa đo được) — coi như desktop
  // để máy chủ và trình duyệt dựng ra cùng một cây, tránh lệch hydrate.
  const isNarrow = screens.lg === false

  return (
    <Layout hasSider={!isNarrow} style={{ minHeight: '100svh' }}>
      {isNarrow ? (
        <Drawer
          open={drawerOpen}
          onClose={() => setOpenedAt(null)}
          placement='left'
          width={268}
          closable={false}
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
        >
          <AdminBrand collapsed={false} />
          <AdminMenu />
        </Drawer>
      ) : (
        <Sider
          width={244}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme='light'
          style={{ borderInlineEnd: '1px solid var(--admin-border)', position: 'sticky', top: 0, height: '100svh' }}
        >
          <AdminBrand collapsed={collapsed} />
          <AdminMenu />
        </Sider>
      )}

      <Layout>
        <AdminHeader
          collapsed={isNarrow ? true : collapsed}
          onToggle={() => (isNarrow ? setOpenedAt(pathname) : setCollapsed((value) => !value))}
          userSlot={userSlot}
        />
        <Content style={{ padding: isNarrow ? 12 : 20 }}>
          <div style={{ maxWidth: 1440, margin: '0 auto' }}>{children}</div>
        </Content>
      </Layout>
    </Layout>
  )
}
