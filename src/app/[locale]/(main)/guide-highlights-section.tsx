'use client'

import { useDesignStore } from '@/features/design'
import { GuideHighlights } from '@/features/guide'
import { useHomeSections } from '@/shared/cms/home-content'
import { sectionIds, sectionText } from '@/shared/cms/home-sections'
import { useHomePageStore } from './home-page.store'

/**
 * App-layer glue: xem xong video hướng dẫn ở trang chủ thì lightbox gợi ý nút
 * "Tạo dự án ngay" (mục II.2, vùng 09) — mở modal của `features/design`, mà
 * `features/guide` thì không được import feature kia.
 *
 * Cũng là nơi đưa nội dung admin lưu ở khối `guides` của trang chủ (tiêu đề, mô tả, nhãn "Xem tất cả" và tối đa 3 video
 * được chọn) xuống `features/guide`, vì feature đó không biết trang chủ.
 */
export function GuideHighlightsSection() {
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)
  const markCreateProjectClicked = useHomePageStore((s) => s.markCreateProjectClicked)
  const sections = useHomeSections()

  return (
    <GuideHighlights
      title={sectionText(sections, 'guides', 'title')}
      subtitle={sectionText(sections, 'guides', 'subtitle')}
      viewAllLabel={sectionText(sections, 'guides', 'viewAll')}
      videoIds={sectionIds(sections, 'guides', 'guideIds')}
      onCreateProject={() => {
        markCreateProjectClicked()
        openCreateDialog()
      }}
    />
  )
}
