import { DEFAULT_PACKAGE_TIER, STYLES_BY_BUILDING_TYPE } from '../constants/design.constants'
import type { BuildingType, DesignInput } from '../types/design.types'
import { buildingTypeFieldConfig, isBuildingTypeActive, type BuildingTypeFieldConfig } from './design-catalog.service'

/**
 * Frozen empty Bước 1 state — gói Tiêu chuẩn được chọn sẵn (mục III.2, trường 6).
 *
 * Exported as a stable reference so Zustand selectors can fall back to it
 * without returning a fresh object on every render (which would re-render forever).
 */
export const EMPTY_DESIGN_INPUT: Readonly<DesignInput> = Object.freeze({
  landPhotoUrl: null,
  address: '',
  addressDetail: Object.freeze({
    street: '',
    wardCode: null,
    wardName: '',
    provinceCode: null,
    provinceName: ''
  }),
  buildingType: null,
  floorCount: null,
  hasAttic: null,
  packageTier: DEFAULT_PACKAGE_TIER,
  style: null,
  wishes: ''
})

/** Mutable copy of {@link EMPTY_DESIGN_INPUT} for stores that write into it. */
export function emptyDesignInput(): DesignInput {
  return { ...EMPTY_DESIGN_INPUT, addressDetail: { ...EMPTY_DESIGN_INPUT.addressDetail } }
}

/** Ghép các phần địa chỉ thành chuỗi gửi lên API: "đường, xã/phường, tỉnh/TP". */
export function composeAddress(detail: DesignInput['addressDetail']): string {
  return [detail.street.trim(), detail.wardName, detail.provinceName].filter(Boolean).join(', ')
}

const NO_FIELDS: BuildingTypeFieldConfig = {
  floorCount: false,
  floorRequired: false,
  floorOptions: [],
  floorDefault: null,
  attic: false,
  atticRequired: false,
  atticFixed: null
}

/**
 * Trường điều kiện của loại công trình đang chọn — theo cấu hình Số tầng / Tum
 * admin đặt ở danh mục Loại công trình (epic ConstructionTypeManagement §7).
 */
export function visibleFields(buildingType: BuildingType | null): BuildingTypeFieldConfig {
  return buildingType ? buildingTypeFieldConfig(buildingType) : NO_FIELDS
}

/**
 * Đổi loại công trình giữa chừng: trường không còn áp dụng bị ẩn VÀ xóa giá trị,
 * các trường còn lại giữ nguyên (mục III.2, ghi chú). Form phải cảnh báo trước
 * khi xóa — xem {@link buildingTypeChangeLosses}.
 */
export function applyBuildingTypeChange(input: DesignInput, buildingType: BuildingType): DesignInput {
  const fields = buildingTypeFieldConfig(buildingType)
  // Danh mục phong cách đổi theo loại; phong cách cũ không còn trong danh mục
  // mới thì bỏ chọn, nếu không thẻ đang chọn sẽ biến mất mà state vẫn giữ.
  const styles = STYLES_BY_BUILDING_TYPE[buildingType]
  return {
    ...input,
    buildingType,
    // Không gửi giá trị không còn áp dụng: số tầng ngoài danh sách phương án mới
    // bị bỏ, Tum cố định thì lấy đúng giá trị cố định (§7).
    floorCount:
      input.floorCount && fields.floorOptions.includes(input.floorCount) ? input.floorCount : fields.floorDefault,
    hasAttic: fields.atticFixed ?? (fields.attic ? input.hasAttic : null),
    style: input.style && styles.includes(input.style) ? input.style : null
  }
}

/**
 * Giá trị Số tầng / Tum đã chọn sẽ bị xóa hoặc đổi nếu chuyển sang loại công
 * trình này — form hỏi lại trước khi xóa, không âm thầm bỏ (epic
 * ConstructionTypeManagement §7).
 */
export function buildingTypeChangeLosses(
  input: DesignInput,
  buildingType: BuildingType
): Array<'floorCount' | 'hasAttic'> {
  const next = applyBuildingTypeChange(input, buildingType)
  const losses: Array<'floorCount' | 'hasAttic'> = []
  if (input.floorCount && next.floorCount !== input.floorCount) losses.push('floorCount')
  if (input.hasAttic !== null && next.hasAttic !== input.hasAttic) losses.push('hasAttic')
  return losses
}

/**
 * Hồ sơ đã lưu vẫn giữ phương án Số tầng admin đã ngừng (§3): hợp lệ khi loại
 * công trình và Số tầng đều trùng bản đã lưu. Chọn MỚI thì chỉ phương án đang
 * Hoạt động.
 */
export function isSavedFloorCount(input: DesignInput, saved: DesignInput | null | undefined): boolean {
  return Boolean(
    saved && input.floorCount && saved.buildingType === input.buildingType && saved.floorCount === input.floorCount
  )
}

/**
 * Bỏ giá trị của trường KHÔNG áp dụng cho cấu hình hiện tại trước khi gửi — trường
 * đang ẩn thì không gửi giá trị ngầm (§7); Tum cố định lấy đúng giá trị cố định.
 */
export function sanitizeDesignInput(input: DesignInput): DesignInput {
  const fields = visibleFields(input.buildingType)
  return {
    ...input,
    floorCount: fields.floorCount ? input.floorCount : null,
    hasAttic: fields.atticFixed ?? (fields.attic ? input.hasAttic : null)
  }
}

/**
 * Kiểm tra lại cấu hình loại công trình tại thời điểm lưu — phía "backend" chạy
 * hàm này, không tin vào việc form đã ẩn / hiện trường (§7, §8). Trả về các
 * trường mâu thuẫn với cấu hình; mảng rỗng là hợp lệ.
 */
export function designInputConfigErrors(
  input: DesignInput,
  saved: DesignInput | null | undefined
): Array<'buildingType' | 'floorCount' | 'hasAttic'> {
  if (!input.buildingType) return []
  const errors: Array<'buildingType' | 'floorCount' | 'hasAttic'> = []
  // Giữ nguyên loại đã Ngừng hoạt động trên hồ sơ cũ thì được; đổi sang nó thì không.
  if (!isBuildingTypeActive(input.buildingType) && saved?.buildingType !== input.buildingType) {
    errors.push('buildingType')
  }
  const fields = visibleFields(input.buildingType)
  if (input.floorCount) {
    const allowed = fields.floorCount && fields.floorOptions.includes(input.floorCount)
    if (!allowed && !(fields.floorCount && isSavedFloorCount(input, saved))) errors.push('floorCount')
  } else if (fields.floorRequired) {
    errors.push('floorCount')
  }
  if (input.hasAttic !== null) {
    const allowed = fields.atticFixed !== null ? input.hasAttic === fields.atticFixed : fields.attic
    if (!allowed) errors.push('hasAttic')
  } else if (fields.atticRequired) {
    errors.push('hasAttic')
  }
  return errors
}

/** Field keys the submit button waits on, in the order they appear on screen. */
export type RequiredInputField = 'landPhotoUrl' | 'address' | 'buildingType' | 'floorCount' | 'hasAttic' | 'packageTier' | 'style' // prettier-ignore

/**
 * Trường bắt buộc còn thiếu, theo thứ tự hiển thị — bấm nút khi thiếu sẽ cuộn
 * tới trường đầu tiên trong danh sách này (mục III.2 + mục VI).
 */
export function missingRequiredFields(input: DesignInput, saved?: DesignInput | null): RequiredInputField[] {
  const fields = visibleFields(input.buildingType)
  const missing: RequiredInputField[] = []
  // Số tầng đã chọn nhưng phương án vừa bị ngừng / bỏ khỏi loại → phải chọn lại (§8).
  const floorValid =
    !!input.floorCount && (fields.floorOptions.includes(input.floorCount) || isSavedFloorCount(input, saved))

  if (!input.landPhotoUrl) missing.push('landPhotoUrl')
  if (!input.address.trim()) missing.push('address')
  // Loại vừa bị Ngừng hoạt động trong lúc nhập → yêu cầu chọn lại (§8).
  if (
    !input.buildingType ||
    (!isBuildingTypeActive(input.buildingType) && saved?.buildingType !== input.buildingType)
  ) {
    missing.push('buildingType')
  }
  if (fields.floorCount && (fields.floorRequired || input.floorCount) && !floorValid) missing.push('floorCount')
  if (fields.atticRequired && input.hasAttic === null) missing.push('hasAttic')
  if (!input.style) missing.push('style')

  return missing
}

/** Nút "Nhận dự toán ngay" chỉ kích hoạt khi đã nhập đủ (mục VI). */
export function canSubmitDesignInput(input: DesignInput, saved?: DesignInput | null): boolean {
  return missingRequiredFields(input, saved).length === 0
}
