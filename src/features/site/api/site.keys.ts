/** Query-key factory cho công trình + gói giám sát của khách. */
export const siteKeys = {
  all: ['site'] as const,
  sites: () => [...siteKeys.all, 'sites'] as const,
  grants: () => [...siteKeys.all, 'grants'] as const
}
