'use client'

import { Menu } from 'antd'
import type { MenuProps } from 'antd'
import { useTranslations } from 'next-intl'
import { createElement, useMemo, useState } from 'react'

import { Link, usePathname } from '@/i18n/navigation'
import { ADMIN_ROUTES } from '@/shared/constants'
import { canAccessAdminRoute, useAuth } from '@/shared/auth'
import { ADMIN_NAV, ADMIN_NAV_ITEMS } from './admin-nav.config'

type MenuItem = NonNullable<MenuProps['items']>[number]

/**
 * Danh sách mục điều hướng. Dùng chung cho `Sider` (màn rộng) và `Drawer`
 * (màn hẹp) nên phần menu tách riêng khỏi khung.
 *
 * Mỗi nhóm là một LUỒNG của khách (xem `admin-nav.config`) và dựng thành một
 * hàng CHA GẬP ĐƯỢC: menu phẳng đủ 20 mục dài quá một màn, phải cuộn mới thấy
 * nhóm cuối. Gập lại thì mọi nhóm nằm gọn trong một màn.
 *
 * Mở MỘT nhóm tại một thời điểm (kiểu đàn xếp): mở nhiều nhóm cùng lúc thì lại
 * dài đúng như cũ, chẳng giải quyết được gì.
 *
 * MỌI nhóm đều có hàng cha, kể cả nhóm một mục (Tổng quan, Tư vấn 1:1). Bỏ hàng
 * cha của riêng chúng cho đỡ một cú bấm thì được, nhưng menu hóa ra hai kiểu
 * hàng trông giống hệt nhau mà hành xử khác nhau — cái bấm ra trang, cái bấm ra
 * danh sách. Đều tay dễ đoán hơn là tiết kiệm một cú bấm.
 *
 * Nhóm "Nội dung site" tạm không dựng — nội dung trang công khai đang sửa ở FE;
 * khi làm CMS thì dựng lại nhóm đó từ `admin-pages.config` như trước.
 */
export function AdminMenu() {
  const t = useTranslations('admin')
  const pathname = usePathname()
  const { user } = useAuth()
  const visibleGroups = useMemo(
    () =>
      ADMIN_NAV.map((group) => ({
        ...group,
        items: group.items.filter((item) => canAccessAdminRoute(user, item.href))
      })).filter((group) => group.items.length > 0),
    [user]
  )

  /** Mục khớp dài nhất thắng — `/admin/bookings/reschedule` không bôi luôn `/admin/bookings`. */
  const selectedKey = useMemo(() => {
    const matches = ADMIN_NAV_ITEMS.filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    ).sort((a, b) => b.href.length - a.href.length)
    return matches[0]?.href ?? ADMIN_ROUTES.DASHBOARD
  }, [pathname])

  /** Nhóm chứa trang đang xem — luôn phải mở, nếu không thì mục đang chọn bị giấu. */
  const activeGroupKey = useMemo(
    () => visibleGroups.find((group) => group.items.some((item) => item.href === selectedKey))?.key,
    [selectedKey, visibleGroups]
  )

  /**
   * Lựa chọn TỰ BẤM của người dùng, kèm nhóm của trang lúc bấm.
   *
   * Nhóm đang mở suy ra từ trang đang xem, trừ khi người dùng vừa tự gập/mở.
   * Ghi kèm `forGroup` để khi chuyển sang trang thuộc nhóm khác (qua breadcrumb
   * hay nút tắt ở Tổng quan) thì lựa chọn cũ hết hiệu lực và nhóm mới tự mở —
   * làm được việc đó mà không cần effect đồng bộ ngược vào state.
   */
  const [manualOpen, setManualOpen] = useState<{ forGroup: string | undefined; keys: string[] } | null>(null)

  const openKeys =
    manualOpen && manualOpen.forGroup === activeGroupKey ? manualOpen.keys : activeGroupKey ? [activeGroupKey] : []

  const items = useMemo<MenuItem[]>(
    () =>
      visibleGroups.map((group) => ({
        key: group.key,
        icon: createElement(group.icon),
        label: t(`navGroups.${group.key}`),
        children: group.items.map((item) => ({
          key: item.href,
          icon: createElement(item.icon),
          label: <Link href={item.href}>{t(`nav.${item.key}`)}</Link>
        }))
      })),
    [t, visibleGroups]
  )

  return (
    <Menu
      mode='inline'
      selectedKeys={[selectedKey]}
      openKeys={openKeys}
      onOpenChange={(keys) => {
        // Giữ lại đúng nhóm vừa mở; bấm vào nhóm đang mở thì đóng hết.
        const opened = keys.find((key) => !openKeys.includes(key as string))
        setManualOpen({ forGroup: activeGroupKey, keys: opened ? [opened as string] : [] })
      }}
      items={items}
      style={{ borderInlineEnd: 0 }}
    />
  )
}
