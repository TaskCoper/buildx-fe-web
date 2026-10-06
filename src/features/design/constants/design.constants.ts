import type {
  BuildingType,
  CostSection,
  DesignStep,
  DesignStyle,
  KnownFloorCount,
  PackageTier,
  ProjectSort,
  ProjectStatus
} from '../types/design.types'

/** Ảnh lô đất — JPG, PNG, HEIC tối đa 10MB (mục III.2, trường 1). */
export const LAND_PHOTO_MAX_BYTES = 10 * 1024 * 1024
export const LAND_PHOTO_ACCEPT = ['image/jpeg', 'image/png', 'image/heic'] as const

/** Mô tả mong muốn — tối đa 500 ký tự (mục III.2, trường 9). */
export const WISHES_MAX_LENGTH = 500

/** 5 nhóm loại công trình theo Phụ lục A, trường 3 — thứ tự cố định. */
export const BUILDING_TYPES: readonly BuildingType[] = ['townhouse', 'villa', 'roofed', 'garden', 'apartment'] as const

/** Phương án Số tầng có sẵn bản dịch — cũng là danh sách dự phòng khi kho chưa có cấu hình. */
export const FLOOR_COUNTS: readonly KnownFloorCount[] = [
  'ground',
  'ground+1',
  'ground+2',
  'ground+3',
  'ground+4'
] as const

/** Slider 3 nấc, mặc định Tiêu chuẩn. */
export const PACKAGE_TIERS: readonly PackageTier[] = ['basic', 'standard', 'vip'] as const
export const DEFAULT_PACKAGE_TIER: PackageTier = 'standard'

/**
 * Danh mục "Kiểu kiến trúc & phong cách" theo từng loại công trình
 * (Phụ lục A, bảng cuối). Admin cấu hình được (mục X, #6) — bảng dưới là seed
 * mặc định cho tới khi CMS trả danh sách thật.
 *
 * Giữ dạng tuple literal để các khóa dịch `design.input.style.options.*` vẫn
 * được kiểm kiểu; chỉ nới thành `string[]` khi danh sách đến từ API kèm nhãn.
 */
export const STYLES_BY_BUILDING_TYPE: Record<BuildingType, readonly DesignStyle[]> = {
  townhouse: ['modern', 'wabi-sabi', 'neoclassical', 'minimal', 'indochine'],
  villa: ['neoclassical', 'modern'],
  roofed: ['thai-roof', 'japanese-roof'],
  garden: ['garden-thai-roof', 'garden-japanese-roof', 'garden-villa', 'level4-modern'],
  apartment: ['modern', 'minimal', 'wabi-sabi']
}

/** Mọi giá trị phong cách đang dùng — phục vụ kiểm kiểu và ảnh minh họa. */
export const DESIGN_STYLES: readonly DesignStyle[] = [
  'modern',
  'wabi-sabi',
  'neoclassical',
  'minimal',
  'indochine',
  'thai-roof',
  'japanese-roof',
  'garden-thai-roof',
  'garden-japanese-roof',
  'garden-villa',
  'level4-modern'
] as const

export const COST_SECTIONS: readonly CostSection[] = ['structure', 'finishing', 'interior'] as const

export const DESIGN_STEPS: readonly DesignStep[] = [1, 2, 3] as const

/** Chip lọc & badge trạng thái ở trang "Dự án của tôi" (mục IV.1, Hình 02). */
export const PROJECT_STATUSES: readonly ProjectStatus[] = ['input', 'designing', 'review', 'completed'] as const

/**
 * 4 thẻ đếm nhanh theo Hình 02 — không có thẻ "Đang nhập liệu"; trạng thái đó
 * chỉ xuất hiện ở hàng chip lọc.
 */
export const PROJECT_STAT_CARDS = ['total', 'designing', 'review', 'completed'] as const
export type ProjectStatCard = (typeof PROJECT_STAT_CARDS)[number]

/** Dropdown sắp xếp — mặc định "Mới cập nhật" (mục IV.1). */
export const PROJECT_SORTS: readonly ProjectSort[] = ['recent', 'oldest', 'name'] as const
export const DEFAULT_PROJECT_SORT: ProjectSort = 'recent'

/** Lưới 3 cột × 3 hàng rồi mới phân trang (mục IV.1). */
export const PROJECTS_PAGE_SIZE = 9

/**
 * Nút "?" của mỗi bước trỏ tới nhóm hướng dẫn nào trên trang Hướng dẫn
 * (mục II.4). Giá trị khớp `GuideTopic` nhưng khai báo dạng chuỗi vì
 * `features/design` không được import `features/guide`.
 */
export const STEP_HELP_TOPIC: Record<DesignStep, string> = {
  1: 'input',
  2: 'read-estimate',
  3: 'dossier'
}

/**
 * Trường nào áp dụng cho loại công trình nào (Phụ lục A, cột "Hiển thị").
 * Bốn nhóm nhà đất dùng chung bộ trường; Căn hộ ẩn Số tầng và Tum.
 */
export const FIELDS_BY_BUILDING_TYPE: Record<BuildingType, { floorCount: boolean; attic: boolean }> = {
  townhouse: { floorCount: true, attic: true },
  villa: { floorCount: true, attic: true },
  roofed: { floorCount: true, attic: true },
  garden: { floorCount: true, attic: true },
  // Căn hộ: ẩn Số tầng (khóa 1 mặt sàn) và Tum (mặc định Không tum).
  apartment: { floorCount: false, attic: false }
}

/** Autosave nháp Bước 1 — thoát ra vào lại vẫn còn nguyên (mục III.2). */
/**
 * Mã lỗi khi lưu Bước 1 mà giá trị mâu thuẫn cấu hình loại công trình hiện tại
 * (loại / phương án vừa bị ngừng, trường không áp dụng) — epic
 * ConstructionTypeManagement §8.
 */
export const DESIGN_INPUT_CONFIG_ERROR = 'DESIGN_INPUT_CONFIG_INVALID'

export const DESIGN_DRAFT_STORAGE_KEY = 'savico.design-draft'
