/**
 * Root namespaces for TanStack Query keys.
 *
 * Each feature composes its own keys under its namespace (see
 * `features/<feature>/api/<feature>.keys.ts`). Keeping the roots here prevents
 * collisions and makes cross-feature cache invalidation discoverable.
 */
export const QUERY_KEY_ROOTS = {
  auth: 'auth',
  projects: 'projects',
  estimates: 'estimates',
  library: 'library',
  gallery: 'gallery',
  portfolio: 'portfolio',
  chatbot: 'chatbot',
  cms: 'cms',
  users: 'users',
  leads: 'leads',
  dashboard: 'dashboard',
  profile: 'profile',
  settings: 'settings',
  location: 'location',
  /** Gói đã mua, lịch sử mua (`features/account`). */
  account: 'account',
  /** Hạn mức tra cứu thư viện còn lại (`features/handbook`). */
  handbook: 'handbook',
  /** Công trình và gói giám sát đã cấp (`features/site`). */
  site: 'site'
} as const

export type QueryKeyRoot = (typeof QUERY_KEY_ROOTS)[keyof typeof QUERY_KEY_ROOTS]
