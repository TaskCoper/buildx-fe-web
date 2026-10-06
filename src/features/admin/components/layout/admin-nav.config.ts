'use client'

import {
  AppstoreOutlined,
  BankOutlined,
  BookOutlined,
  BuildOutlined,
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  HistoryOutlined,
  GiftOutlined,
  OrderedListOutlined,
  PlayCircleOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  SkinOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons'
import type { ComponentType } from 'react'

import { ADMIN_ROUTES, type AdminRoute } from '@/shared/constants'

/**
 * Menu trái — dựng quanh VIỆC VẬN HÀNH HẰNG NGÀY, theo thứ tự ưu tiên.
 *
 *   · Tổng quan         — hàng đợi việc hôm nay.
 *   · Thanh toán        — tra cứu đơn, mã giảm giá, sổ giao dịch (trạng thái do BE cập nhật).
 *   · Tìm nhà thầu      — lời mời & lịch khảo sát (một màn), danh bạ nhà thầu.
 *   · Giám sát thi công — xác nhận giai đoạn, yêu cầu sửa đổi.
 *   · Tư vấn 1:1        — lịch hẹn.
 *   · Khách hàng        — tài khoản, dự án thiết kế, kiểm duyệt review / báo cáo.
 *   · Thư viện          — kho mẫu 2D/3D và video hướng dẫn.
 *   · Cấu hình          — CON SỐ điều khiển hệ thống: giá gói, hạn mức, danh mục, đơn giá.
 *
 * Nhóm theo LUỒNG của khách chứ không theo kiểu dữ liệu: nhận cuộc gọi "tôi mời
 * nhà thầu rồi mà chưa ai gọi lại" thì mọi thứ của luồng đó nằm cạnh nhau.
 *
 * Nhóm "Nội dung site" (CMS theo trang) tạm GỠ khỏi menu — nội dung trang công
 * khai đang sửa thẳng ở FE. Route `/admin/content/[page]` và `admin-pages.config`
 * vẫn còn nguyên để bật lại khi làm CMS.
 *
 * "Kỳ đăng ký gói" (gia hạn / hủy tay) cũng gỡ khỏi menu: kích hoạt và hết hạn gói do
 * backend xử lý; gói hiện tại của khách xem ở "Tài khoản khách".
 *
 * `key` là hậu tố khóa dịch dưới namespace `admin.nav`.
 */
export const ADMIN_NAV = [
  // Đã ẩn "Tổng quan" (overview/dashboard) khỏi menu theo yêu cầu; route /admin và
  // trang AdminInbox vẫn còn để bật lại sau; /admin chọn mục đầu được phép.
  {
    key: 'payments',
    icon: DollarOutlined,
    items: [
      { key: 'orders', href: ADMIN_ROUTES.ORDERS, icon: DollarOutlined },
      { key: 'transactions', href: ADMIN_ROUTES.TRANSACTIONS, icon: FileTextOutlined },
      { key: 'paymentConnections', href: ADMIN_ROUTES.PAYMENT_CONNECTIONS, icon: BankOutlined }
    ]
  },
  {
    key: 'packages',
    icon: GiftOutlined,
    // Đã gỡ "Quà tặng" (gifts) và "Gói giám sát" (supervisionPackages) khỏi menu
    // theo yêu cầu; route và trang vẫn còn để bật lại sau nếu cần.
    items: [{ key: 'planTable', href: ADMIN_ROUTES.PLAN_TABLE, icon: GiftOutlined }]
  },
  {
    key: 'contractorFlow',
    icon: TeamOutlined,
    // Đã ẩn "Quy tắc đề xuất" (contractorMatching) và "Lịch khảo sát"
    // (surveySchedule) khỏi menu theo yêu cầu; route và trang vẫn còn để bật lại.
    items: [
      { key: 'contractors', href: ADMIN_ROUTES.CONTRACTORS, icon: TeamOutlined },
      { key: 'invitations', href: ADMIN_ROUTES.INVITATIONS, icon: SendOutlined }
    ]
  },
  {
    key: 'supervision',
    icon: SafetyCertificateOutlined,
    items: [
      { key: 'constructionSites', href: ADMIN_ROUTES.CONSTRUCTION_SITES, icon: EnvironmentOutlined }
      // Đã ẩn "Dự án giám sát" (inspections) và "Giai đoạn giám sát" (supervisionStages) khỏi menu theo yêu cầu; route
      // và trang vẫn còn để bật lại.
    ]
  },
  {
    key: 'consult',
    icon: CalendarOutlined,
    items: [
      { key: 'consultants', href: ADMIN_ROUTES.CONSULTANTS, icon: TeamOutlined },
      { key: 'bookings', href: ADMIN_ROUTES.BOOKINGS, icon: CalendarOutlined }
    ]
  },
  {
    key: 'people',
    icon: UserOutlined,
    items: [{ key: 'customers', href: ADMIN_ROUTES.CUSTOMERS, icon: UserOutlined }]
  },
  {
    key: 'access',
    icon: SafetyCertificateOutlined,
    items: [
      { key: 'roles', href: ADMIN_ROUTES.ROLES, icon: SafetyCertificateOutlined },
      { key: 'staff', href: ADMIN_ROUTES.STAFF, icon: TeamOutlined },
      // Đã ẩn "Phân công giám sát" (assignments) khỏi menu theo yêu cầu; route và trang vẫn còn để bật lại.
      { key: 'accessAudit', href: ADMIN_ROUTES.ACCESS_AUDIT, icon: HistoryOutlined }
    ]
  },
  {
    key: 'catalog',
    icon: AppstoreOutlined,
    items: [
      { key: 'buildingTypes', href: ADMIN_ROUTES.BUILDING_TYPES, icon: AppstoreOutlined },
      { key: 'styles', href: ADMIN_ROUTES.STYLES, icon: SkinOutlined },
      { key: 'constructionScopes', href: ADMIN_ROUTES.CONSTRUCTION_SCOPES, icon: BuildOutlined }
    ]
  },
  {
    key: 'library',
    icon: BookOutlined,
    items: [
      { key: 'templates', href: ADMIN_ROUTES.TEMPLATES, icon: BookOutlined },
      // Đã ẩn "Lượt xem mẫu" (templateViews) khỏi menu theo yêu cầu; route và trang vẫn còn để bật lại.
      { key: 'articles', href: ADMIN_ROUTES.ARTICLES, icon: FileTextOutlined },
      { key: 'handbookSteps', href: ADMIN_ROUTES.HANDBOOK_STEPS, icon: OrderedListOutlined },
      { key: 'guideVideos', href: ADMIN_ROUTES.GUIDE_VIDEOS, icon: PlayCircleOutlined }
      // Đã ẩn "Đánh giá khách hàng" (testimonials) khỏi menu theo yêu cầu; route và trang vẫn còn để bật lại.
    ]
  }
  // Đã ẩn "Cấu hình dự toán" (config: nhóm chi phí, hạng mục, đơn giá vật liệu,
  // tư vấn dự toán) khỏi menu theo yêu cầu; route và trang vẫn còn để bật lại sau.
] as const satisfies readonly {
  key: string
  /** Biểu tượng của hàng cha trong menu gập. */
  icon: ComponentType
  items: readonly { key: string; href: AdminRoute; icon: ComponentType }[]
}[]

export type AdminNavGroup = (typeof ADMIN_NAV)[number]
export type AdminNavItem = AdminNavGroup['items'][number]

/** Mọi mục ngoài nhóm nội dung, phẳng — dùng để tra tiêu đề trang theo pathname. */
export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = ADMIN_NAV.flatMap<AdminNavItem>((group) => [...group.items])
