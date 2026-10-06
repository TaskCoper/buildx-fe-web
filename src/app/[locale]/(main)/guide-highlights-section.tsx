'use client'

import { useDesignStore } from '@/features/design'
import { GuideHighlights } from '@/features/guide'
import { useHomePageStore } from './home-page.store'

/**
 * App-layer glue: xem xong video hướng dẫn ở trang chủ thì lightbox gợi ý nút
 * "Tạo dự án ngay" (mục II.2, vùng 09) — mở modal của `features/design`, mà
 * `features/guide` thì không được import feature kia.
 */
export function GuideHighlightsSection() {
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)
  const markCreateProjectClicked = useHomePageStore((s) => s.markCreateProjectClicked)

  return (
    <GuideHighlights
      onCreateProject={() => {
        markCreateProjectClicked()
        openCreateDialog()
      }}
    />
  )
}
