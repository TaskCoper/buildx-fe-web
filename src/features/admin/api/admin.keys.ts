import type { Locale } from '@/i18n/routing'
import type { CmsCollection, CmsDocument } from '@/shared/cms'

/**
 * Query key phân cấp của khu quản trị.
 *
 * Ngôn ngữ nội dung nằm TRONG key: bản tiếng Việt và bản tiếng Anh của cùng một
 * bảng là hai cache khác nhau, đổi ngôn ngữ nội dung là tải đúng bản đó chứ
 * không hiện nhầm bản vừa xem.
 */
export const adminKeys = {
  all: ['admin'] as const,

  collections: () => [...adminKeys.all, 'collection'] as const,
  collection: (collection: CmsCollection, locale: Locale) => [...adminKeys.collections(), collection, locale] as const,
  collectionAllLocales: (collection: CmsCollection) => [...adminKeys.collections(), collection] as const,

  documents: () => [...adminKeys.all, 'document'] as const,
  document: (document: CmsDocument, locale: Locale) => [...adminKeys.documents(), document, locale] as const,

  /** Dữ liệu nằm trên BMT API (không phải kho CMS): `bmt(resource, ...params)`. */
  bmt: (resource: string, ...params: unknown[]) => [...adminKeys.all, 'bmt', resource, ...params] as const
} as const
