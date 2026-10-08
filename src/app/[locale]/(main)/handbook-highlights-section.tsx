'use client'

import { HandbookHighlights } from '@/features/handbook'
import { useHomeSections } from '@/shared/cms/home-content'
import { sectionIds, sectionText } from '@/shared/cms/home-sections'

/**
 * App-layer glue: đưa chữ và danh sách bài admin lưu ở khối `articles` của trang chủ xuống `features/handbook`
 * (`features/handbook` không đọc nội dung trang chủ trực tiếp).
 */
export function HandbookHighlightsSection() {
  const sections = useHomeSections()

  return (
    <HandbookHighlights
      title={sectionText(sections, 'articles', 'title')}
      viewAllLabel={sectionText(sections, 'articles', 'viewAll')}
      articleIds={sectionIds(sections, 'articles', 'articleIds')}
    />
  )
}
