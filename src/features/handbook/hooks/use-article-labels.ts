'use client'

import { useMemo } from 'react'

import { useTranslations } from 'next-intl'

import { useCmsCollection } from '@/shared/cms'

/**
 * Nhãn bài viết do admin quản lý (BR-136): bộ lọc chỉ gồm nhãn Active theo thứ
 * tự admin sắp; tên nhãn đọc từ bảng nhãn nên đổi tên là mọi khu vực đổi theo.
 */
export function useArticleLabels() {
  const t = useTranslations('handbook.articles')
  const labels = useCmsCollection('articleLabels')
  const options = useMemo(
    () =>
      labels
        .filter((label) => label.status === 'active')
        .sort((a, b) => a.order - b.order)
        .map((label) => label.id),
    [labels]
  )
  // Bài không gắn danh mục nào mang `category` rỗng và hiện nhãn "Chưa phân loại" (BR-NEWS-003 khoản 8).
  const nameOf = (id: string) =>
    id === '' ? t('uncategorized') : (labels.find((label) => label.id === id)?.name ?? id)
  return { options, nameOf }
}
