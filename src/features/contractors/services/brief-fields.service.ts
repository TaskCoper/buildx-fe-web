import type { CmsBuildingTypeOption, CmsFloorOption } from '@/shared/cms'

import { PROJECT_SCALES } from '../constants/contractors.constants'
import type { ProjectScale } from '../types/contractor.types'

/**
 * Trường Số tầng / Tum của hồ sơ dự án theo cấu hình Loại công trình của admin
 * (epic ConstructionTypeManagement §7). Cùng quy tắc với form Bước 1 của luồng
 * thiết kế, nhưng khai riêng vì hai feature không được import lẫn nhau.
 */
export interface BriefFieldConfig {
  floors: boolean
  floorRequired: boolean
  floorOptions: readonly ProjectScale[]
  attic: boolean
  atticRequired: boolean
  /** Giá trị Tum cố định (không hỏi); `null` khi không cố định. */
  atticFixed: boolean | null
}

const NONE: BriefFieldConfig = {
  floors: false,
  floorRequired: false,
  floorOptions: [],
  attic: false,
  atticRequired: false,
  atticFixed: null
}

function isProjectScale(id: string): id is ProjectScale {
  return (PROJECT_SCALES as readonly string[]).includes(id)
}

export function briefFieldConfig(
  buildingTypeId: string | null,
  buildingTypes: readonly CmsBuildingTypeOption[],
  floorOptions: readonly CmsFloorOption[]
): BriefFieldConfig {
  const option = buildingTypes.find((item) => item.id === buildingTypeId)
  if (!option) return NONE

  return {
    floors: option.floors.applies,
    floorRequired: option.floors.applies && option.floors.required,
    floorOptions: option.floors.applies
      ? floorOptions
          .filter((floor) => floor.status === 'active' && option.floors.optionIds.includes(floor.id))
          .sort((a, b) => a.order - b.order)
          .map((floor) => floor.id)
          .filter(isProjectScale)
      : [],
    attic: option.attic.mode === 'choice',
    atticRequired: option.attic.mode === 'choice' && option.attic.required,
    atticFixed: option.attic.mode === 'fixed-yes' ? true : option.attic.mode === 'fixed-no' ? false : null
  }
}
