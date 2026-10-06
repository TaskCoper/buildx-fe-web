'use client'

import { useLocale } from 'next-intl'
import { useSyncExternalStore } from 'react'

import type { Locale } from '@/i18n/routing'
import { cmsDb, cmsDocumentSeedOf, cmsSeedOf } from './cms.db'
import type { CmsCollection, CmsCollectionMap, CmsDocument, CmsDocumentMap } from './cms.db'

/**
 * Đọc kho nội dung từ giao diện công khai, theo ngôn ngữ đang xem.
 *
 * `useSyncExternalStore` cho phép render phía máy chủ bằng SEED rồi tự đổi sang
 * bản admin đã sửa sau khi hydrate — không lệch HTML, không nhấp nháy.
 */

export function useCmsCollection<K extends CmsCollection>(collection: K): CmsCollectionMap[K][] {
  const locale = useLocale() as Locale
  return useSyncExternalStore(
    cmsDb.subscribe,
    () => cmsDb.listStable(collection, locale),
    () => cmsSeedOf(collection)
  )
}

export function useCmsDocument<K extends CmsDocument>(document: K): CmsDocumentMap[K] {
  const locale = useLocale() as Locale
  return useSyncExternalStore(
    cmsDb.subscribe,
    () => cmsDb.getDocumentStable(document, locale),
    () => cmsDocumentSeedOf(document)
  )
}

/**
 * Ưu tiên chữ admin đã soạn, rỗng thì rơi về bản dịch i18n. Nhờ vậy CMS chỉ GHI
 * ĐÈ chứ không thay thế next-intl — ngôn ngữ nào admin chưa soạn thì vẫn có bản
 * dịch trong `messages/*.json` đỡ.
 */
export function cmsText(override: string | undefined, fallback: string): string {
  const trimmed = override?.trim()
  return trimmed ? trimmed : fallback
}
