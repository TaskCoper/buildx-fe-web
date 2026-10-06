'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Locale } from '@/i18n/routing'
import type { CmsCollection, CmsCollectionMap, CmsDocument, CmsDocumentMap } from '@/shared/cms'
import { adminApi } from '../api/admin.api'
import { adminKeys } from '../api/admin.keys'
import { useCmsLocaleStore } from '../store/cms-locale.store'

/**
 * Hook dùng chung cho mọi bảng của khu quản trị.
 *
 * Mọi màn quản lý đều là "liệt kê → sửa trong Drawer → lưu / xóa", nên một bộ
 * hook generic phục vụ được tất cả; màn nào cũng chỉ khai tên bảng. Ngôn ngữ
 * nội dung lấy từ công tắc trên thanh trên, không phải tham số của từng màn.
 */

/** Ngôn ngữ nội dung đang biên tập. */
export function useCmsLocale(): Locale {
  return useCmsLocaleStore((state) => state.locale)
}

/** Sau khi ghi: làm mới đúng bảng vừa đụng. */
function useInvalidate(collection: CmsCollection) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.collectionAllLocales(collection) })
}

export function useAdminCollection<K extends CmsCollection>(collection: K) {
  const locale = useCmsLocale()
  return useQuery({
    queryKey: adminKeys.collection(collection, locale),
    queryFn: () => adminApi.list(collection, locale)
  })
}

export function useSaveAdminItem<K extends CmsCollection>(collection: K) {
  const locale = useCmsLocale()
  const invalidate = useInvalidate(collection)
  return useMutation({
    mutationFn: (item: CmsCollectionMap[K]) => adminApi.save(collection, item, locale),
    onSuccess: invalidate
  })
}

export function useDeleteAdminItem<K extends CmsCollection>(collection: K) {
  const locale = useCmsLocale()
  const invalidate = useInvalidate(collection)
  return useMutation({
    mutationFn: (id: string) => adminApi.remove(collection, id, locale),
    onSuccess: invalidate
  })
}

export function useReorderAdminCollection<K extends CmsCollection>(collection: K) {
  const locale = useCmsLocale()
  const invalidate = useInvalidate(collection)
  return useMutation({
    mutationFn: (items: CmsCollectionMap[K][]) => adminApi.reorder(collection, items, locale),
    onSuccess: invalidate
  })
}

export function useAdminDocument<K extends CmsDocument>(document: K) {
  const locale = useCmsLocale()
  return useQuery({
    queryKey: adminKeys.document(document, locale),
    queryFn: () => adminApi.getDocument(document, locale)
  })
}

export function useSaveAdminDocument<K extends CmsDocument>(document: K) {
  const locale = useCmsLocale()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (value: CmsDocumentMap[K]) => adminApi.saveDocument(document, value, locale),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.documents() })
  })
}
