/** Query-key factory cho công trình + gói giám sát của khách. */
export const siteKeys = {
  all: ['site'] as const,
  sites: () => [...siteKeys.all, 'sites'] as const,
  /** Danh sách đã lọc theo mã; nằm dưới `sites()` nên invalidate `sites()` làm mới cả các bản lọc. */
  sitesByCode: (code: string) => [...siteKeys.sites(), { code }] as const,
  grants: () => [...siteKeys.all, 'grants'] as const
}
