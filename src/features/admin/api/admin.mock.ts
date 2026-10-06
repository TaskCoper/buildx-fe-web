import type { Locale } from '@/i18n/routing'
import { cmsDb } from '@/shared/cms'
import type { CmsCollection, CmsCollectionMap, CmsDocument, CmsDocumentMap } from '@/shared/cms'
import { mockDelay } from '@/shared/lib/mock'

/**
 * Mock CRUD của khu quản trị — ghi thẳng vào kho `shared/cms` (localStorage).
 *
 * Nhờ vậy chưa có backend mà sửa nội dung vẫn "thật": lưu xong mở trang công
 * khai là thấy đổi, tải lại trình duyệt vẫn còn. Mọi hàm nhận `locale` vì kho
 * giữ một bản nội dung cho mỗi ngôn ngữ.
 */

export const mockAdminApi = {
  list: async <K extends CmsCollection>(collection: K, locale: Locale): Promise<CmsCollectionMap[K][]> => {
    await mockDelay(200)
    return cmsDb.list(collection, locale)
  },

  save: async <K extends CmsCollection>(
    collection: K,
    item: CmsCollectionMap[K],
    locale: Locale
  ): Promise<CmsCollectionMap[K]> => {
    await mockDelay(300)
    return cmsDb.upsert(collection, item, locale)
  },

  remove: async <K extends CmsCollection>(collection: K, id: string, locale: Locale): Promise<void> => {
    await mockDelay(250)
    cmsDb.remove(collection, id, locale)
  },

  reorder: async <K extends CmsCollection>(
    collection: K,
    items: CmsCollectionMap[K][],
    locale: Locale
  ): Promise<void> => {
    await mockDelay(200)
    cmsDb.replace(collection, items, locale)
  },

  getDocument: async <K extends CmsDocument>(document: K, locale: Locale): Promise<CmsDocumentMap[K]> => {
    await mockDelay(150)
    return cmsDb.getDocument(document, locale)
  },

  saveDocument: async <K extends CmsDocument>(
    document: K,
    value: CmsDocumentMap[K],
    locale: Locale
  ): Promise<CmsDocumentMap[K]> => {
    await mockDelay(300)
    return cmsDb.saveDocument(document, value, locale)
  }
}
