/** Codes from bmt-be PermissionNames; never infer permissions from a role label. */
export const PERMISSIONS = {
  COMMERCE_READ: 'commerce.read',
  CUSTOMER_MANAGE: 'customer.manage',
  PACKAGE_CANCEL: 'package.cancel',
  SUPERVISION_UNASSIGN: 'supervision.unassign',
  SUPERVISION_COMPLETE: 'supervision.complete',
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',
  ASSIGNMENT_MANAGE: 'assignment.manage',
  AUDIT_READ: 'audit.read',
  PLAN_MANAGE: 'plan.manage',
  ESTIMATE_CATALOG_MANAGE: 'estimate.catalog.manage',
  /** Xem và sửa cấu hình AI của luồng dự toán (TDD-PROJ-008 mục H). */
  ESTIMATE_PIPELINE_CONFIG_MANAGE: 'estimate.pipeline.config.manage',
  /** Xem lần chạy, cột nhật ký AI và phần nội bộ. */
  ESTIMATE_PIPELINE_INSPECT: 'estimate.pipeline.inspect',
  /** Đặt lại bộ đếm lỗi và đọc bản thô của nhật ký AI (mỗi lần đọc đều ghi vết). */
  ESTIMATE_PIPELINE_OPERATE: 'estimate.pipeline.operate',
  /** Miền giá theo tỉnh (đợt 1), luật giá (đợt 2). */
  ESTIMATE_PRICING_MANAGE: 'estimate.pricing.manage',
  PAYMENT_CONNECTION_MANAGE: 'payment.connection.manage',
  CONSULTATION_MANAGE: 'consultation.manage',
  NEWS_MANAGE: 'news.manage',
  LIBRARY_MANAGE: 'library.manage',
  GUIDE_MANAGE: 'guide.manage',
  CONSTRUCTION_SITE_CONDITION_MANAGE: 'construction-site.condition.manage',
  QUOTATION_REQUEST_MANAGE: 'quotation-request.manage',
  SYSTEM_CONFIGURATION_MANAGE: 'system.configuration.manage'
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
