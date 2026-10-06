import { cmsDb, type CmsBuildingTypeOption, type CmsFloorOption, type CmsStyleOption } from '@/shared/cms'

import {
  BUILDING_TYPES,
  DESIGN_STYLES,
  FIELDS_BY_BUILDING_TYPE,
  FLOOR_COUNTS,
  STYLES_BY_BUILDING_TYPE
} from '../constants/design.constants'
import type { BuildingType, DesignStyle, FloorCount } from '../types/design.types'

/**
 * Danh mục Bước 1 lấy từ kho nội dung (mục X, #6: admin cấu hình loại công
 * trình và phong cách).
 *
 * Hai quy tắc của lớp này:
 *
 *  1. **Chỉ nhận id đã biết.** `BuildingType` / `DesignStyle` là union chuỗi cố
 *     định vì còn kéo theo trường điều kiện (`FIELDS_BY_BUILDING_TYPE`), ảnh
 *     minh họa và khóa dịch. Admin bịa thêm id lạ thì bỏ qua chứ không làm vỡ
 *     luồng — thêm loại mới vẫn phải khai báo trong `design.constants`.
 *  2. **Rỗng thì rơi về hằng số.** Admin tắt hết (hoặc kho chưa có gì) vẫn phải
 *     chọn được, nên danh sách rỗng sẽ dùng bảng mặc định theo Phụ lục A.
 *
 * Nhãn để `undefined` khi admin chưa soạn — lớp hook ghép với bản dịch i18n qua
 * `cmsText`, giống cách trang chủ làm.
 */

export interface CatalogBuildingType {
  value: BuildingType
  label?: string
  /**
   * Loại đã Ngừng hoạt động nhưng hồ sơ này đã lưu từ trước — vẫn hiện để hồ sơ
   * cũ giữ nguyên, nhưng không chọn lại được (epic ConstructionTypeManagement §8).
   */
  inactive?: boolean
}

export interface CatalogStyle {
  value: DesignStyle
  label?: string
  imageUrl?: string
}

function isBuildingType(id: string): id is BuildingType {
  return (BUILDING_TYPES as readonly string[]).includes(id)
}

function isDesignStyle(id: string): id is DesignStyle {
  return (DESIGN_STYLES as readonly string[]).includes(id)
}

/**
 * Loại công trình hiện trong ô chọn, theo thứ tự admin xếp. Chỉ loại Hoạt động;
 * riêng `savedType` — loại hồ sơ đã lưu — vẫn hiện kèm cờ `inactive` khi admin
 * đã ngừng nó, để hồ sơ cũ không mất loại đã chọn (§1, §8).
 */
export function catalogBuildingTypes(
  options: readonly CmsBuildingTypeOption[],
  savedType: BuildingType | null = null
): readonly CatalogBuildingType[] {
  const fromCms = options
    .filter((option) => option.status === 'active' || option.id === savedType)
    .sort((a, b) => a.order - b.order)
    .flatMap<CatalogBuildingType>((option) =>
      isBuildingType(option.id)
        ? [{ value: option.id, label: option.label, inactive: option.status !== 'active' || undefined }]
        : []
    )

  return fromCms.some((option) => !option.inactive) ? fromCms : BUILDING_TYPES.map((value) => ({ value }))
}

/** Loại công trình đang Hoạt động (loại chưa có trong kho coi như hoạt động — bảng mặc định). */
export function isBuildingTypeActive(
  buildingType: BuildingType,
  options: readonly CmsBuildingTypeOption[] = cmsDb.list('buildingTypes')
): boolean {
  return options.find((item) => item.id === buildingType)?.status !== 'inactive'
}

/** Thẻ phong cách của loại công trình đang chọn (Phụ lục A, bảng cuối). */
export function catalogStyles(
  options: readonly CmsStyleOption[],
  buildingType: BuildingType | null
): readonly CatalogStyle[] {
  if (!buildingType) return []

  const fromCms = options
    // Trường phong cách của Bước 1 là phong cách KIẾN TRÚC; danh mục nội thất đi riêng.
    .filter(
      (option) => option.kind === 'architecture' && option.enabled && option.buildingTypeIds.includes(buildingType)
    )
    .sort((a, b) => a.order - b.order)
    .flatMap<CatalogStyle>((option) =>
      isDesignStyle(option.id) ? [{ value: option.id, label: option.label, imageUrl: option.imageUrl }] : []
    )

  return fromCms.length > 0 ? fromCms : STYLES_BY_BUILDING_TYPE[buildingType].map((value) => ({ value }))
}

/**
 * Cấu hình Số tầng / Tum của một loại công trình (epic ConstructionTypeManagement
 * §3, §4, §7) — admin quyết định form hiện trường nào, phương án nào, bắt buộc
 * hay không. Loại chưa có trong kho thì rơi về `FIELDS_BY_BUILDING_TYPE`.
 */
export interface BuildingTypeFieldConfig {
  floorCount: boolean
  floorRequired: boolean
  /** Phương án Số tầng được phép VÀ đang Hoạt động, theo thứ tự admin xếp. */
  floorOptions: readonly FloorCount[]
  /** Phương án chọn sẵn do admin đặt; `null` khi không có hoặc không còn hợp lệ. */
  floorDefault: FloorCount | null
  /** Chỉ `true` khi Tum ở chế độ "cho phép lựa chọn". */
  attic: boolean
  atticRequired: boolean
  /** Giá trị Tum cố định (không hỏi người dùng); `null` khi không cố định. */
  atticFixed: boolean | null
}

export function buildingTypeFieldConfig(
  buildingType: BuildingType,
  options: readonly CmsBuildingTypeOption[] = cmsDb.list('buildingTypes'),
  floorOptions: readonly CmsFloorOption[] = cmsDb.list('floorOptions')
): BuildingTypeFieldConfig {
  const option = options.find((item) => item.id === buildingType)
  if (!option) {
    const fallback = FIELDS_BY_BUILDING_TYPE[buildingType]
    return {
      floorCount: fallback.floorCount,
      floorRequired: fallback.floorCount,
      floorOptions: fallback.floorCount ? FLOOR_COUNTS : [],
      floorDefault: null,
      attic: fallback.attic,
      atticRequired: fallback.attic,
      atticFixed: null
    }
  }

  // Phương án admin thêm mới cũng hiện — nhãn lấy từ danh mục (`useFloorCountLabel`).
  const allowed = floorOptions
    .filter((floor) => floor.status === 'active' && option.floors.optionIds.includes(floor.id))
    .sort((a, b) => a.order - b.order)
    .map((floor) => floor.id)
  const floorDefault = option.floors.defaultOptionId

  return {
    floorCount: option.floors.applies,
    floorRequired: option.floors.applies && option.floors.required,
    floorOptions: option.floors.applies ? allowed : [],
    floorDefault: option.floors.applies && floorDefault && allowed.includes(floorDefault) ? floorDefault : null,
    attic: option.attic.mode === 'choice',
    atticRequired: option.attic.mode === 'choice' && option.attic.required,
    atticFixed: option.attic.mode === 'fixed-yes' ? true : option.attic.mode === 'fixed-no' ? false : null
  }
}
