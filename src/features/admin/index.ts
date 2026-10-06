/**
 * Public API của feature `admin` — khu quản trị SAVICO AI.
 *
 * Giao diện chạy trên Ant Design (chỉ nạp trong route group `(admin)`), dữ liệu
 * đọc/ghi kho nội dung dùng chung `shared/cms` nên sửa ở đây là site công khai
 * đổi theo.
 */
export { AdminShell } from './components/layout/admin-shell'
export { AdminRouteGuard, AdminLanding } from './components/layout/admin-route-guard'
export { AdminInbox } from './components/dashboard/admin-inbox'
export { AdminCharts } from './components/dashboard/admin-charts'

// Cấu hình hệ thống — con số điều khiển cách hệ thống chạy.
export { PlanManager } from './components/business/plan-manager'
export { GiftManager } from './components/business/gift-manager'
export { QuotaEditor } from './components/business/quota-editor'

// Thư viện — kho mẫu và video do đội nội dung nhập, đứng riêng khỏi nhóm CMS
// theo trang: đây là BẢNG BẢN GHI thêm/sửa/xóa hằng ngày, không phải chữ của
// một trang cụ thể.
export { LibraryTemplateManager } from './components/handbook/library-template-manager'
export { ArticleManager } from './components/handbook/article-manager'
export { ArticleLabelManager } from './components/handbook/article-label-manager'
export { HandbookStepManager } from './components/handbook/handbook-step-manager'
export { TestimonialManager } from './components/site/testimonial-manager'
export { GuideVideoManager } from './components/guide/guide-manager'

// Vận hành — dữ liệu backend sinh ra, vẫn là màn đứng riêng.
export { OrderManager } from './components/ops/order-manager'
export { DiscountManager } from './components/ops/discount-manager'
export { ContractorAdminManager } from './components/ops/contractor-admin-manager'
export { AccessAuditManager } from './components/access/access-audit-manager'
export { PaymentConnectionManager } from './components/business/payment-connection-manager'
export { ContractorManager } from './components/ops/contractor-manager'
export { ContractorDetail } from './components/ops/contractor-detail'
export { ContractorMatchingEditor } from './components/ops/contractor-matching'
export { SurveyScheduleManager } from './components/ops/survey-schedule'
export { SupervisionPackageManager } from './components/ops/supervision-package-manager'
export { SupervisionStageManager } from './components/ops/supervision-stage-manager'
export { BookingManager } from './components/consult/booking-manager'
export { ConsultantManager } from './components/consult/consultant-manager'
export { TransactionManager } from './components/business/transaction-manager'
export { InvitationManager } from './components/business/invitation-manager'
export { InspectionManager } from './components/business/inspection-manager'
export { CustomerManager } from './components/business/customer-manager'
export { CustomerDetail } from './components/business/customer-detail'
export { RoleManager } from './components/access/role-manager'
export { StaffManager } from './components/access/staff-manager'
export { AssignmentManager } from './components/access/assignment-manager'

export { BuildingTypeManager } from './components/catalog/building-type-manager'
export { ConstructionScopeManager } from './components/catalog/construction-scope-manager'
export { ConstructionSiteManager } from './components/ops/construction-site-manager'
export { StyleManager } from './components/catalog/style-manager'
export { CostGroupManager } from './components/estimate/cost-group-manager'
export { CostItemManager } from './components/estimate/cost-item-manager'
export { MaterialPriceManager } from './components/estimate/material-price-manager'
export { EstimateAdviceEditor } from './components/estimate/estimate-advice-editor'

export { ADMIN_NAV, ADMIN_NAV_ITEMS, type AdminNavGroup, type AdminNavItem } from './components/layout/admin-nav.config'
export { adminApi } from './api/admin.api'
export {
  ApiResourceManager,
  type ApiPageParams,
  type ApiResourceManagerProps,
  type ApiRowContext
} from './components/common/api-resource-manager'
export { adminKeys } from './api/admin.keys'
export {
  useAdminCollection,
  useCmsLocale,
  useAdminDocument,
  useDeleteAdminItem,
  useReorderAdminCollection,
  useSaveAdminDocument,
  useSaveAdminItem
} from './hooks/use-admin-data'
export { useCmsLocaleStore } from './store/cms-locale.store'
export { newAdminId, slugify, todayKey } from './services/admin.service'
