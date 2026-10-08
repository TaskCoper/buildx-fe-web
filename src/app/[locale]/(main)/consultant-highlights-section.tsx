'use client'

import { ConsultantHighlights } from '@/features/consultation'
import { useHomeSections } from '@/shared/cms/home-content'
import { sectionIds, sectionText } from '@/shared/cms/home-sections'
import { useActiveProject } from './use-active-project'

/**
 * App-layer glue: "có dự án → KTS đúng loại nhà lên đầu" (mục II.2, vùng 10)
 * cần loại công trình của dự án dở gần nhất, mà `features/consultation` không
 * được import `features/design`. Id chuyên môn của KTS trùng thẳng với
 * `BuildingType` (xem `shared/cms/seeds/consultation.seed.ts`), nên không cần
 * bảng ánh xạ nào — chỉ truyền thẳng qua.
 *
 * Cũng là nơi đưa chữ admin lưu ở khối `consult` của trang chủ xuống `features/consultation`.
 */
export function ConsultantHighlightsSection() {
  const activeProject = useActiveProject()
  const sections = useHomeSections()

  return (
    <ConsultantHighlights
      preferredSpecialtyId={activeProject?.buildingType ?? undefined}
      title={sectionText(sections, 'consult', 'title')}
      description={sectionText(sections, 'consult', 'description')}
      viewAllLabel={sectionText(sections, 'consult', 'viewAll')}
      consultantIds={sectionIds(sections, 'consult', 'architectIds')}
    />
  )
}
