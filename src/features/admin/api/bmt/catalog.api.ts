import { http } from '@/shared/lib/api'

/**
 * Danh mục dự toán (EstimateCatalogAdmin) — loại công trình, cấu hình tầng/tum
 * và hai nhóm phong cách. Cần quyền `estimate.catalog.manage`.
 *
 * Danh mục CÓ PHIÊN BẢN: mỗi lần lưu tạo một revision mới và tăng
 * `catalogVersion`. Mọi thao tác ghi gửi lại `expectedCatalogVersion` đã đọc —
 * lệch thì BE trả 409 `CatalogVersionConflict`. API không có xóa, không có trạng
 * thái bật/tắt cho loại hay phong cách và không có thứ tự sắp xếp.
 */

export type CatalogStyleGroup = 'Architecture' | 'Interior'

export interface CatalogBuildingTypeDto {
  buildingTypeId: string
  name: string
  floorsEnabled: boolean
  tumEnabled: boolean
  architectureEnabled: boolean
  interiorEnabled: boolean
  /** Số tầng được chọn: 1 là Trệt, 3 là Trệt + 2 lầu. Nhóm tắt vẫn giữ danh sách. */
  floorCounts: number[]
  architectureStyleIds: string[]
  interiorStyleIds: string[]
}

export interface CatalogStyleDto {
  styleId: string
  name: string
  imageUrl: string
}

export interface AdminCatalog {
  catalogVersion: number
  catalogRevisionId: string | null
  buildingTypes: CatalogBuildingTypeDto[]
  architectureStyles: CatalogStyleDto[]
  interiorStyles: CatalogStyleDto[]
}

interface RawCatalogView {
  catalogRevisionId?: string | null
  buildingTypes?: Partial<CatalogBuildingTypeDto>[] | null
  architectureStyles?: Partial<CatalogStyleDto>[] | null
  interiorStyles?: Partial<CatalogStyleDto>[] | null
}

interface RawAdminCatalogView {
  catalogVersion?: number
  catalog?: RawCatalogView | null
}

export interface BuildingTypeInput {
  name: string
  floorsEnabled: boolean
  tumEnabled: boolean
  architectureEnabled: boolean
  interiorEnabled: boolean
  floorCounts: number[]
  architectureStyleIds: string[]
  interiorStyleIds: string[]
}

export interface StyleInput {
  name: string
  imageUrl: string
}

export interface CatalogSaved {
  catalogVersion: number
  catalogRevisionId?: string
}

/** `POST /styles` trả kèm `styleId` để gán ngay vào loại công trình sau khi tạo. */
export interface StyleSaved extends CatalogSaved {
  styleId: string
}

const BASE = '/admin/estimate-catalog'

const idempotent = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } })

function toBuildingType(raw: Partial<CatalogBuildingTypeDto>): CatalogBuildingTypeDto {
  return {
    buildingTypeId: raw.buildingTypeId ?? '',
    name: raw.name ?? '',
    floorsEnabled: Boolean(raw.floorsEnabled),
    tumEnabled: Boolean(raw.tumEnabled),
    architectureEnabled: Boolean(raw.architectureEnabled),
    interiorEnabled: Boolean(raw.interiorEnabled),
    floorCounts: [...(raw.floorCounts ?? [])].sort((a, b) => a - b),
    architectureStyleIds: raw.architectureStyleIds ?? [],
    interiorStyleIds: raw.interiorStyleIds ?? []
  }
}

function toStyle(raw: Partial<CatalogStyleDto>): CatalogStyleDto {
  return { styleId: raw.styleId ?? '', name: raw.name ?? '', imageUrl: raw.imageUrl ?? '' }
}

/** Danh mục hiện hành, gồm cả danh sách được giữ của nhóm đang tắt. */
export async function getEstimateCatalog(): Promise<AdminCatalog> {
  const res = await http.get<RawAdminCatalogView>(BASE)
  const catalog = res.catalog ?? {}
  return {
    catalogVersion: res.catalogVersion ?? 0,
    catalogRevisionId: catalog.catalogRevisionId ?? null,
    buildingTypes: (catalog.buildingTypes ?? []).map(toBuildingType),
    architectureStyles: (catalog.architectureStyles ?? []).map(toStyle),
    interiorStyles: (catalog.interiorStyles ?? []).map(toStyle)
  }
}

export function createBuildingType(expectedCatalogVersion: number, input: BuildingTypeInput): Promise<CatalogSaved> {
  return http.post<CatalogSaved>(`${BASE}/building-types`, { expectedCatalogVersion, ...input }, idempotent())
}

export function updateBuildingType(
  buildingTypeId: string,
  expectedCatalogVersion: number,
  input: BuildingTypeInput
): Promise<CatalogSaved> {
  return http.put<CatalogSaved>(
    `${BASE}/building-types/${buildingTypeId}`,
    { expectedCatalogVersion, ...input },
    idempotent()
  )
}

/** Nhóm (`group`) chỉ đặt lúc tạo, không đổi được sau đó. */
export function createCatalogStyle(
  expectedCatalogVersion: number,
  group: CatalogStyleGroup,
  input: StyleInput
): Promise<StyleSaved> {
  return http.post<StyleSaved>(`${BASE}/styles`, { expectedCatalogVersion, group, ...input }, idempotent())
}

export function updateCatalogStyle(
  styleId: string,
  expectedCatalogVersion: number,
  input: StyleInput
): Promise<CatalogSaved> {
  return http.put<CatalogSaved>(`${BASE}/styles/${styleId}`, { expectedCatalogVersion, ...input }, idempotent())
}
