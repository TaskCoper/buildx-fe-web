'use client'

import {
  AppstoreOutlined,
  BankOutlined,
  BookOutlined,
  BuildOutlined,
  CalendarOutlined,
  DollarOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  HistoryOutlined,
  HomeOutlined,
  GiftOutlined,
  MonitorOutlined,
  PlayCircleOutlined,
  ProfileOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  SettingOutlined,
  SkinOutlined,
  SolutionOutlined,
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
 *   · Nội dung          — biên tập trang chủ, footer, Tìm nhà thầu, Cẩm nang và Bảng giá.
 *   · Cấu hình          — CON SỐ điều khiển hệ thống: giá gói, hạn mức, danh mục, đơn giá.
 *
 * Nhóm theo LUỒNG của khách chứ không theo kiểu dữ liệu: nhận cuộc gọi "tôi mời
 * nhà thầu rồi mà chưa ai gọi lại" thì mọi thứ của luồng đó nằm cạnh nhau.
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
    key: 'estimatePipeline',
    icon: RobotOutlined,
    items: [
      { key: 'estimateAiConfig', href: ADMIN_ROUTES.ESTIMATE_AI_CONFIG, icon: SettingOutlined },
      { key: 'estimateAiRules', href: ADMIN_ROUTES.ESTIMATE_AI_RULES, icon: SettingOutlined },
      { key: 'estimatePrompts', href: ADMIN_ROUTES.ESTIMATE_PROMPTS, icon: EditOutlined },
      { key: 'estimatePriceRules', href: ADMIN_ROUTES.ESTIMATE_PRICE_RULES, icon: FileTextOutlined },
      { key: 'pricingRegions', href: ADMIN_ROUTES.PRICING_REGIONS, icon: EnvironmentOutlined },
      { key: 'estimatePipeline', href: ADMIN_ROUTES.ESTIMATE_PIPELINE, icon: MonitorOutlined }
    ]
  },
  {
    key: 'library',
    icon: BookOutlined,
    items: [
      { key: 'templates', href: ADMIN_ROUTES.TEMPLATES, icon: BookOutlined },
      // Đã ẩn "Lượt xem mẫu" (templateViews) khỏi menu theo yêu cầu; route và trang vẫn còn để bật lại.
      { key: 'articles', href: ADMIN_ROUTES.ARTICLES, icon: FileTextOutlined },
      { key: 'guideVideos', href: ADMIN_ROUTES.GUIDE_VIDEOS, icon: PlayCircleOutlined }
      // Đã ẩn "Đánh giá khách hàng" (testimonials) khỏi menu theo yêu cầu; route và trang vẫn còn để bật lại.
    ]
  },
  {
    key: 'content',
    icon: EditOutlined,
    items: [
      { key: 'homeContent', href: ADMIN_ROUTES.HOME_CONTENT, icon: HomeOutlined },
      { key: 'footerContent', href: ADMIN_ROUTES.FOOTER_CONTENT, icon: ProfileOutlined },
      { key: 'contractorsContent', href: ADMIN_ROUTES.CONTRACTORS_CONTENT, icon: SolutionOutlined },
      // Các bước và Bản tin của Cẩm nang đã gộp vào tab Tin tức của màn này.
      { key: 'handbookContent', href: ADMIN_ROUTES.HANDBOOK_CONTENT, icon: EditOutlined },
      { key: 'plansContent', href: ADMIN_ROUTES.PLANS_CONTENT, icon: EditOutlined }
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

/** Mọi mục điều hướng, phẳng — dùng để tra tiêu đề trang theo pathname. */
export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = ADMIN_NAV.flatMap<AdminNavItem>((group) => [...group.items])
