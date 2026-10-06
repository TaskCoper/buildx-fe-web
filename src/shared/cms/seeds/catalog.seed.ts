import { STYLE_IMAGE } from '@/shared/lib/imagery'
import type { CmsBuildingTypeOption, CmsFloorOption, CmsStyleOption } from '../cms.types'

/**
 * Danh mục Bước 1 và bảng đơn giá dự toán — mục X, #6 ghi rõ admin cấu hình
 * được. Seed dưới đây phản chiếu `features/design/constants` để hai bên khớp
 * nhau; sửa ở trang quản trị là đổi bảng cấu hình admin đang dùng.
 */
/** Năm phương án Số tầng xác nhận từ giao diện (epic ConstructionTypeManagement §3). */
export const FLOOR_OPTIONS_SEED: CmsFloorOption[] = [
  { id: 'ground', label: 'Trệt', status: 'active', order: 1 },
  { id: 'ground+1', label: 'Trệt + 1 lầu', status: 'active', order: 2 },
  { id: 'ground+2', label: 'Trệt + 2 lầu', status: 'active', order: 3 },
  { id: 'ground+3', label: 'Trệt + 3 lầu', status: 'active', order: 4 },
  { id: 'ground+4', label: 'Trệt + 4 lầu', status: 'active', order: 5 }
]

const ALL_FLOORS = FLOOR_OPTIONS_SEED.map((option) => option.id)

/** Nhà ở nhiều tầng: hỏi Số tầng và Tum, cả hai bắt buộc. */
const HOUSE_CONFIG: Pick<CmsBuildingTypeOption, 'floors' | 'attic'> = {
  floors: { applies: true, required: true, optionIds: ALL_FLOORS },
  attic: { mode: 'choice', required: true }
}

export const BUILDING_TYPES_SEED: CmsBuildingTypeOption[] = [
  { id: 'townhouse', label: 'Nhà phố', status: 'active', order: 1, ...HOUSE_CONFIG },
  { id: 'villa', label: 'Villa - Biệt thự', status: 'active', order: 2, ...HOUSE_CONFIG },
  { id: 'roofed', label: 'Nhà mái', status: 'active', order: 3, ...HOUSE_CONFIG },
  { id: 'garden', label: 'Nhà vườn - Nhà cấp 4', status: 'active', order: 4, ...HOUSE_CONFIG },
  {
    id: 'apartment',
    label: 'Căn hộ',
    description: 'Căn hộ khóa một mặt sàn — không hỏi Số tầng và Tum.',
    status: 'active',
    order: 5,
    floors: { applies: false, required: false, optionIds: [] },
    attic: { mode: 'none', required: false }
  }
]

/** Kiểu kiến trúc & phong cách, kèm loại công trình mà nó xuất hiện (Phụ lục A, trường 7). */
const ARCHITECTURE_STYLES: Omit<CmsStyleOption, 'kind'>[] = [
  {
    id: 'modern',
    label: 'Hiện đại',
    imageUrl: STYLE_IMAGE.modern,
    buildingTypeIds: ['townhouse', 'villa', 'apartment'],
    enabled: true,
    order: 1
  },
  {
    id: 'wabi-sabi',
    label: 'Wabi (Wabi-sabi)',
    imageUrl: STYLE_IMAGE['wabi-sabi'],
    buildingTypeIds: ['townhouse', 'apartment'],
    enabled: true,
    order: 2
  },
  {
    id: 'neoclassical',
    label: 'Tân cổ điển',
    imageUrl: STYLE_IMAGE.neoclassical,
    buildingTypeIds: ['townhouse', 'villa'],
    enabled: true,
    order: 3
  },
  {
    id: 'minimal',
    label: 'Tối giản (Minimalism)',
    imageUrl: STYLE_IMAGE.minimal,
    buildingTypeIds: ['townhouse', 'apartment'],
    enabled: true,
    order: 4
  },
  {
    id: 'indochine',
    label: 'Indochine',
    imageUrl: STYLE_IMAGE.indochine,
    buildingTypeIds: ['townhouse'],
    enabled: true,
    order: 5
  },
  {
    id: 'thai-roof',
    label: 'Nhà mái Thái hiện đại',
    imageUrl: STYLE_IMAGE['thai-roof'],
    buildingTypeIds: ['roofed'],
    enabled: true,
    order: 6
  },
  {
    id: 'japanese-roof',
    label: 'Nhà mái Nhật hiện đại',
    imageUrl: STYLE_IMAGE['japanese-roof'],
    buildingTypeIds: ['roofed'],
    enabled: true,
    order: 7
  },
  {
    id: 'garden-thai-roof',
    label: 'Nhà vườn mái Thái',
    imageUrl: STYLE_IMAGE['garden-thai-roof'],
    buildingTypeIds: ['garden'],
    enabled: true,
    order: 8
  },
  {
    id: 'garden-japanese-roof',
    label: 'Nhà vườn mái Nhật',
    imageUrl: STYLE_IMAGE['garden-japanese-roof'],
    buildingTypeIds: ['garden'],
    enabled: true,
    order: 9
  },
  {
    id: 'garden-villa',
    label: 'Biệt thự / Villa sân vườn',
    imageUrl: STYLE_IMAGE['garden-villa'],
    buildingTypeIds: ['garden'],
    enabled: true,
    order: 10
  },
  {
    id: 'level4-modern',
    label: 'Nhà cấp 4 hiện đại',
    imageUrl: STYLE_IMAGE['level4-modern'],
    buildingTypeIds: ['garden'],
    enabled: true,
    order: 11
  }
]

/** Phong cách nội thất (STORY-004) — áp cho mọi loại công trình. */
const INTERIOR_STYLES: Omit<CmsStyleOption, 'kind'>[] = [
  ['in-modern', 'Hiện đại (Modern)'],
  ['in-japandi', 'Japandi'],
  ['in-neoclassical', 'Tân cổ điển (Neoclassical)'],
  ['in-indochine', 'Indochine'],
  ['in-luxury', 'Luxury'],
  ['in-scandinavian', 'Scandinavian'],
  ['in-minimalism', 'Minimalism'],
  ['in-wabi-sabi', 'Wabi-Sabi']
].map(([id = '', label = ''], index) => ({
  id,
  label,
  imageUrl: '',
  buildingTypeIds: BUILDING_TYPES_SEED.map((type) => type.id),
  enabled: true,
  order: index + 1
}))

/** Hai danh mục phong cách chung một bảng, phân biệt bằng `kind` (spec admin #1). */
export const STYLE_OPTIONS_SEED: CmsStyleOption[] = [
  ...ARCHITECTURE_STYLES.map((style) => ({ ...style, kind: 'architecture' as const })),
  ...INTERIOR_STYLES.map((style) => ({ ...style, kind: 'interior' as const }))
]
