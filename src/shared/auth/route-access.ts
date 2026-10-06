import { ADMIN_ROUTES, PROTECTED_ROUTE_PREFIXES, ROUTES, type AdminRoute } from '../constants/routes'
import { ROLES } from './auth.constants'
import type { AuthUser } from './auth.types'
import { PERMISSIONS as P, type PermissionCode } from './permissions'

type AdminAccessRule = { anyPermission: readonly PermissionCode[] } | { adminOnly: true }

/**
 * Mirrors endpoint policies. Legacy CMS and contractor APIs still require the
 * system Admin role. Permission-based APIs have no implicit Admin bypass.
 * New sections must declare a rule before either their menu or content opens.
 */
export const ADMIN_ROUTE_ACCESS = {
  [ADMIN_ROUTES.ORDERS]: { anyPermission: [P.COMMERCE_READ] },
  [ADMIN_ROUTES.TRANSACTIONS]: { anyPermission: [P.COMMERCE_READ] },
  [ADMIN_ROUTES.CUSTOMERS]: { anyPermission: [P.COMMERCE_READ] },
  [ADMIN_ROUTES.PLAN_TABLE]: { anyPermission: [P.PLAN_MANAGE] },
  [ADMIN_ROUTES.GIFTS]: { adminOnly: true },
  [ADMIN_ROUTES.TEMPLATE_VIEWS]: { adminOnly: true },
  [ADMIN_ROUTES.PAYMENT_CONNECTIONS]: { anyPermission: [P.PAYMENT_CONNECTION_MANAGE] },
  [ADMIN_ROUTES.CONTRACTORS]: { adminOnly: true },
  [ADMIN_ROUTES.CONTRACTOR_MATCHING]: { adminOnly: true },
  [ADMIN_ROUTES.SURVEY_SCHEDULE]: { adminOnly: true },
  [ADMIN_ROUTES.TEMPLATES]: { anyPermission: [P.LIBRARY_MANAGE] },
  [ADMIN_ROUTES.TEMPLATES_3D]: { anyPermission: [P.LIBRARY_MANAGE] },
  [ADMIN_ROUTES.ARTICLES]: { anyPermission: [P.NEWS_MANAGE] },
  [ADMIN_ROUTES.ARTICLE_LABELS]: { anyPermission: [P.NEWS_MANAGE] },
  [ADMIN_ROUTES.TESTIMONIALS]: { adminOnly: true },
  [ADMIN_ROUTES.HANDBOOK_STEPS]: { adminOnly: true },
  [ADMIN_ROUTES.GUIDE_VIDEOS]: { anyPermission: [P.GUIDE_MANAGE] },
  [ADMIN_ROUTES.DISCOUNTS]: { adminOnly: true },
  [ADMIN_ROUTES.SUPERVISION_PACKAGES]: { adminOnly: true },
  [ADMIN_ROUTES.SUPERVISION_STAGES]: { adminOnly: true },
  [ADMIN_ROUTES.CONSULTANTS]: { anyPermission: [P.CONSULTATION_MANAGE] },
  [ADMIN_ROUTES.BOOKINGS]: { anyPermission: [P.CONSULTATION_MANAGE] },
  [ADMIN_ROUTES.INVITATIONS]: { anyPermission: [P.QUOTATION_REQUEST_MANAGE] },
  [ADMIN_ROUTES.INSPECTIONS]: { adminOnly: true },
  [ADMIN_ROUTES.ROLES]: { anyPermission: [P.ROLE_MANAGE] },
  [ADMIN_ROUTES.STAFF]: { anyPermission: [P.USER_MANAGE] },
  [ADMIN_ROUTES.ASSIGNMENTS]: { anyPermission: [P.ASSIGNMENT_MANAGE] },
  [ADMIN_ROUTES.CONSTRUCTION_SITES]: { anyPermission: [P.ASSIGNMENT_MANAGE, P.SUPERVISION_COMPLETE] },
  [ADMIN_ROUTES.ACCESS_AUDIT]: { anyPermission: [P.AUDIT_READ] },
  [ADMIN_ROUTES.BUILDING_TYPES]: { anyPermission: [P.ESTIMATE_CATALOG_MANAGE] },
  [ADMIN_ROUTES.STYLES]: { anyPermission: [P.ESTIMATE_CATALOG_MANAGE] },
  [ADMIN_ROUTES.CONSTRUCTION_SCOPES]: { adminOnly: true },
  [ADMIN_ROUTES.ARCHITECTURE_STYLES]: { anyPermission: [P.ESTIMATE_CATALOG_MANAGE] },
  [ADMIN_ROUTES.INTERIOR_STYLES]: { anyPermission: [P.ESTIMATE_CATALOG_MANAGE] },
  [ADMIN_ROUTES.COST_GROUPS]: { adminOnly: true },
  [ADMIN_ROUTES.COST_ITEMS]: { adminOnly: true },
  [ADMIN_ROUTES.MATERIAL_PRICES]: { adminOnly: true },
  [ADMIN_ROUTES.ESTIMATE_ADVICE]: { adminOnly: true }
} as const satisfies Record<Exclude<AdminRoute, typeof ADMIN_ROUTES.DASHBOARD>, AdminAccessRule>

export function matchesRoute(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function isCustomerRoute(path: string): boolean {
  return (
    PROTECTED_ROUTE_PREFIXES.some((prefix) => prefix !== ADMIN_ROUTES.DASHBOARD && matchesRoute(path, prefix)) ||
    path.startsWith(`${ROUTES.CONTRACTORS}/`)
  )
}

export function isProtectedPath(path: string): boolean {
  return matchesRoute(path, ADMIN_ROUTES.DASHBOARD) || isCustomerRoute(path)
}

export function hasPermission(user: AuthUser | null, permission: PermissionCode): boolean {
  return (
    user?.accountKind === 'Staff' &&
    !user.mustChangePassword &&
    user.emailVerified !== false &&
    Boolean(user.permissions?.includes(permission))
  )
}

export function canAccessAdminRoute(user: AuthUser | null, pathname: string): boolean {
  if (user?.accountKind !== 'Staff' || user.mustChangePassword || user.emailVerified === false) return false
  if (pathname === ADMIN_ROUTES.DASHBOARD) return true
  const entry = Object.entries(ADMIN_ROUTE_ACCESS)
    .filter(([route]) => matchesRoute(pathname, route))
    .sort(([a], [b]) => b.length - a.length)[0]
  if (!entry) return false
  const rule: AdminAccessRule = entry[1]
  return 'adminOnly' in rule
    ? user.roles.includes(ROLES.ADMIN)
    : rule.anyPermission.some((code) => hasPermission(user, code))
}

export function authHome(user: AuthUser): string {
  return user.accountKind === 'Staff' ? ADMIN_ROUTES.DASHBOARD : ROUTES.HOME
}

/** Safe, locale-independent return URL; keep the query and refuse disallowed areas. */
export function loginDestination(user: AuthUser, target?: string | null): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || /[\\\x00-\x20]/.test(target))
    return authHome(user)
  let decoded: string
  try {
    decoded = decodeURIComponent(target.split(/[?#]/)[0] ?? '')
  } catch {
    return authHome(user)
  }
  if (decoded.startsWith('//') || /[\\\x00-\x20]/.test(decoded)) return authHome(user)
  const url = new URL(target, 'https://routing.invalid')
  url.searchParams.delete('auth')
  url.searchParams.delete('redirect')
  const path =
    (decodeURIComponent(url.pathname).replace(/^\/(vi|en)(?=\/|$)/, '') || ROUTES.HOME).replace(/\/+$/, '') ||
    ROUTES.HOME
  const normalized = `${path}${url.search}${url.hash}`
  if (matchesRoute(path, ROUTES.FORGOT_PASSWORD) || path === ROUTES.GOOGLE_CALLBACK) return authHome(user)
  if (matchesRoute(path, ADMIN_ROUTES.DASHBOARD) && !canAccessAdminRoute(user, path)) return authHome(user)
  if (isCustomerRoute(path) && user.accountKind !== 'Customer') return authHome(user)
  return normalized
}
