'use client'

import {
  ExportOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined
} from '@ant-design/icons'
import { App, Breadcrumb, Button, Dropdown, Grid, Layout, Segmented, Space, Tooltip, Typography } from 'antd'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import type { ReactNode } from 'react'

import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { LOCALES, type Locale } from '@/i18n/routing'
import { CMS_LOCALES } from '@/shared/cms'
import { ROUTES } from '@/shared/constants'
import { useCmsLocaleStore } from '../../store/cms-locale.store'
import { useHasUnsavedChanges } from '../../store/dirty.store'
import { ADMIN_NAV } from './admin-nav.config'

const { Header } = Layout
const { Text } = Typography

/** Tạm ẩn chọn ngôn ngữ bảng điều khiển (mặc định tiếng Việt). `true` để bật lại. */
const SHOW_LANGUAGE_TOGGLE = false

/** Tạm ẩn đổi giao diện (khóa nền sáng — xem `theme-provider`). `true` để bật lại. */
const SHOW_THEME_TOGGLE = false

/** Tạm ẩn công tắc đổi ngôn ngữ NỘI DUNG (chỉ soạn tiếng Việt). `true` để bật lại. */
const SHOW_CONTENT_LOCALE_TOGGLE = false

/**
 * Thanh trên cùng của khu quản trị.
 *
 * Chỗ này KHÔNG lặp lại tiêu đề trang (đầu trang đã có `AdminPage`) mà hiện
 * đường dẫn "nhóm › trang" — đó là thứ duy nhất người vận hành không tự suy ra
 * được khi menu trái đang thu gọn hoặc đang nằm sau nút menu trên màn hẹp.
 *
 * Có HAI công tắc ngôn ngữ, cố ý tách bạch:
 *   · "Nội dung" — bản dịch đang biên tập. Đây là thứ quyết định lưu vào ngăn
 *     nào của kho, nên để nổi bật nhất bên phải tiêu đề.
 *   · Quả địa cầu — ngôn ngữ của chính bảng điều khiển. Người vận hành người
 *     Việt vẫn giữ giao diện tiếng Việt trong khi soạn bản tiếng Anh.
 */
export function AdminHeader({
  collapsed,
  onToggle,
  userSlot
}: {
  collapsed: boolean
  onToggle: () => void
  userSlot?: ReactNode
}) {
  const t = useTranslations('admin')
  const pathname = usePathname()
  const router = useRouter()
  const uiLocale = useLocale()
  const screens = Grid.useBreakpoint()
  const { modal } = App.useApp()
  const { resolvedTheme, setTheme } = useTheme()
  const hasUnsaved = useHasUnsavedChanges()

  const contentLocale = useCmsLocaleStore((state) => state.locale)
  const setContentLocale = useCmsLocaleStore((state) => state.setLocale)

  /**
   * Đổi ngôn ngữ nội dung là nạp lại toàn bộ form bằng bản dịch khác — mọi thứ
   * đang gõ dở sẽ mất. Hỏi trước khi làm chuyện đó.
   */
  function switchContentLocale(next: Locale) {
    if (!hasUnsaved) {
      setContentLocale(next)
      return
    }
    modal.confirm({
      title: t('shell.switchLocaleTitle'),
      content: t('shell.switchLocaleBody'),
      okText: t('actions.discard'),
      okButtonProps: { danger: true },
      cancelText: t('actions.keepEditing'),
      onOk: () => setContentLocale(next)
    })
  }

  /** Đường dẫn hiển thị: NHÓM › TRANG, tra trong `ADMIN_NAV` (mục dài nhất khớp trước). */
  const match = ADMIN_NAV.flatMap((group) => group.items.map((item) => ({ group, item })))
    .filter(({ item }) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.item.href.length - a.item.href.length)[0]
  const trail = match ? [t(`navGroups.${match.group.key}`), t(`nav.${match.item.key}`)] : [t('shell.title')]

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        paddingInline: screens.md ? 24 : 12,
        position: 'sticky',
        top: 0,
        zIndex: 10,
        borderBottom: '1px solid var(--admin-border)'
      }}
    >
      <Button
        type='text'
        aria-label={t('shell.toggleSidebar')}
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={onToggle}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <Breadcrumb items={trail.map((title) => ({ title }))} />
      </div>

      <Space size={4}>
        {/* Đổi ngôn ngữ NỘI DUNG TẠM ẨN (chỉ soạn tiếng Việt) — bật lại: đổi cờ thành true. */}
        {SHOW_CONTENT_LOCALE_TOGGLE && (
          <Tooltip title={t('shell.contentLocaleHint')}>
            <Space size={6}>
              <Text type='secondary' style={{ fontSize: 12, whiteSpace: 'nowrap' }} className='hidden md:inline'>
                {t('shell.contentLocale')}
              </Text>
              <Segmented
                size='small'
                value={contentLocale}
                onChange={(value) => switchContentLocale(value as Locale)}
                options={CMS_LOCALES.map((code) => ({ label: code.toUpperCase(), value: code }))}
              />
            </Space>
          </Tooltip>
        )}

        {/* Toggle ngôn ngữ bảng điều khiển TẠM ẨN — mặc định tiếng Việt. */}
        {SHOW_LANGUAGE_TOGGLE && (
          <Dropdown
            menu={{
              selectable: true,
              selectedKeys: [uiLocale],
              items: LOCALES.map((code) => ({
                key: code,
                label: t(`shell.uiLocaleOption.${code}`),
                onClick: () => router.replace(pathname, { locale: code })
              }))
            }}
          >
            <Button type='text' aria-label={t('shell.uiLocale')} icon={<GlobalOutlined />} />
          </Dropdown>
        )}

        {SHOW_THEME_TOGGLE && (
          <Tooltip title={t('shell.toggleTheme')}>
            <Button
              type='text'
              aria-label={t('shell.toggleTheme')}
              icon={resolvedTheme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            />
          </Tooltip>
        )}

        <Tooltip title={t('shell.viewSite')}>
          <Link href={ROUTES.HOME} target='_blank' rel='noreferrer'>
            <Button type='text' aria-label={t('shell.viewSite')} icon={<ExportOutlined />} />
          </Link>
        </Tooltip>

        {userSlot}
      </Space>
    </Header>
  )
}
