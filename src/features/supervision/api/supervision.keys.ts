/** Query-key factory cho feature `supervision` (S19–S24). */
export const supervisionKeys = {
  all: ['supervision'] as const,
  /** Gói giám sát công bố trên BMT API (trang S19 + luồng mua). */
  packages: () => [...supervisionKeys.all, 'packages'] as const,
  /** Gói giám sát của tôi trên BMT API (`/me/supervision-grants`). */
  grants: () => [...supervisionKeys.all, 'grants'] as const,
  projects: () => [...supervisionKeys.all, 'project'] as const,
  /** Toàn bộ dữ liệu giám sát của một dự án — mọi màn S20–S24 đọc key này. */
  project: (projectId: string) => [...supervisionKeys.projects(), projectId] as const
} as const
