'use client'

import { useMemo } from 'react'

import { useCmsCollection } from '@/shared/cms'

/**
 * Nhãn bài viết do admin quản lý (BR-136): bộ lọc chỉ gồm nhãn Active theo thứ
 * tự admin sắp; tên nhãn đọc từ bảng nhãn nên đổi tên là mọi khu vực đổi theo.
 */
export function useArticleLabels() {
  const labels = useCmsCollection('articleLabels')
  const options = useMemo(
    () =>
      labels
        .filter((label) => label.status === 'active')
        .sort((a, b) => a.order - b.order)
        .map((label) => label.id),
    [labels]
  )
  const nameOf = (id: string) => labels.find((label) => label.id === id)?.name ?? id
  return { options, nameOf }
}
