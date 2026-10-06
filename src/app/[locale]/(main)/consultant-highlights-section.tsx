'use client'

import { ConsultantHighlights } from '@/features/consultation'
import { useActiveProject } from './use-active-project'

/**
 * App-layer glue: "có dự án → KTS đúng loại nhà lên đầu" (mục II.2, vùng 10)
 * cần loại công trình của dự án dở gần nhất, mà `features/consultation` không
 * được import `features/design`. Id chuyên môn của KTS trùng thẳng với
 * `BuildingType` (xem `shared/cms/seeds/consultation.seed.ts`), nên không cần
 * bảng ánh xạ nào — chỉ truyền thẳng qua.
 */
export function ConsultantHighlightsSection() {
  const activeProject = useActiveProject()
  return <ConsultantHighlights preferredSpecialtyId={activeProject?.buildingType ?? undefined} />
}
