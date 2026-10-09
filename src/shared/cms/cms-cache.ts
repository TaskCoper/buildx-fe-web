export const CMS_PAGE_KEYS = ['home', 'footer', 'contractors', 'handbook'] as const
export const CMS_LOCALES = ['vi', 'en'] as const

export type CmsPageKey = (typeof CMS_PAGE_KEYS)[number]
export type CmsLocale = (typeof CMS_LOCALES)[number]

export interface CmsCacheTarget {
  pageKey: CmsPageKey | 'all'
  locale: CmsLocale | 'all'
}

export const cmsCacheTag = (pageKey: string, locale: string) => `cms:${pageKey}:${locale}`

/** Cache trình duyệt cho khối nội dung công khai, dùng chung giữa trang đọc và admin. */
export const cmsSectionsQueryKey = (pageKey: string, locale: string) => [pageKey, 'page-sections', locale] as const

/** Chỉ nhận các trang CMS đã khai báo; không cho caller xoá cache đường dẫn tùy ý. */
export function cmsCacheEntries(target: CmsCacheTarget) {
  const pages = target.pageKey === 'all' ? CMS_PAGE_KEYS : [target.pageKey]
  const locales = target.locale === 'all' ? CMS_LOCALES : [target.locale]
  return pages.flatMap((pageKey) =>
    locales.map((locale) => ({
      tag: cmsCacheTag(pageKey, locale),
      path: `/${locale}${pageKey === 'home' || pageKey === 'footer' ? '' : `/${pageKey}`}`,
      type: pageKey === 'footer' ? ('layout' as const) : ('page' as const)
    }))
  )
}
