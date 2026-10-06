/** Codes from bmt-be PermissionNames; never infer permissions from a role label. */
export const PERMISSIONS = {
  COMMERCE_READ: 'commerce.read',
  PACKAGE_CANCEL: 'package.cancel',
  SUPERVISION_UNASSIGN: 'supervision.unassign',
  SUPERVISION_COMPLETE: 'supervision.complete',
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',
  ASSIGNMENT_MANAGE: 'assignment.manage',
  AUDIT_READ: 'audit.read',
  PLAN_MANAGE: 'plan.manage',
  ESTIMATE_CATALOG_MANAGE: 'estimate.catalog.manage',
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
